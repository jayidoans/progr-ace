begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'CLAIM_SUBMITTED', 'CLAIM_REVIEWED',
    'PROGRAM_CANCELLATION_REQUESTED', 'PROGRAM_CANCELLATION_DECIDED'
  )),
  event_key text not null unique,
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null check (length(trim(body)) between 1 and 1000),
  target_path text check (
    target_path is null or target_path ~ '^/dashboard(/[a-zA-Z0-9_-]+)*$'
  ),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;

create policy "notifications_select_recipient" on public.notifications
for select to authenticated using (recipient_user_id = (select auth.uid()));

create function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  update public.notifications set read_at = now()
  where id = p_notification_id and recipient_user_id = auth.uid() and read_at is null;
  return exists (
    select 1 from public.notifications
    where id = p_notification_id and recipient_user_id = auth.uid()
  );
end;
$$;

create function public.mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  update public.notifications set read_at = now()
  where recipient_user_id = auth.uid() and read_at is null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create function public.notify_claim_validation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  claim_record record;
begin
  -- The M6 evaluator updates its provisional validation before returning from
  -- Claim submission. Only the final NEEDS_REVIEW result requires Coach action.
  if new.evaluation_source = 'AUTOMATIC' and new.result = 'NEEDS_REVIEW'
    and old.evaluation_source = 'AUTOMATIC'
  then
    select claim.id as claim_id, prescription.title as prescription_title,
      program.created_by as coach_id, profile.full_name as athlete_name
    into claim_record
    from public.training_claims claim
    join public.training_prescriptions prescription on prescription.id = claim.prescription_id
    join public.training_weeks week on week.id = prescription.training_week_id
    join public.training_programs program on program.id = week.training_program_id
    join public.profiles profile on profile.id = claim.athlete_id
    where claim.id = new.claim_id and claim.status = 'SUBMITTED';

    if claim_record.coach_id is not null and exists (
      select 1 from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = claim_record.coach_id and role.name = 'COACH'
    ) then
      insert into public.notifications (
        recipient_user_id, type, event_key, title, body, target_path
      ) values (
        claim_record.coach_id, 'CLAIM_SUBMITTED', 'claim-submitted:' || new.claim_id,
        'Training submitted for review',
        left(coalesce(nullif(trim(claim_record.athlete_name), ''), 'An athlete') ||
          ' submitted ' || claim_record.prescription_title || ' for your review.', 1000),
        '/dashboard/validation/' || new.claim_id
      ) on conflict (event_key) do nothing;
    end if;
  end if;

  if old.evaluation_source = 'AUTOMATIC' and new.evaluation_source = 'COACH'
    and new.result in ('VERIFIED', 'PARTIAL', 'REJECTED')
  then
    select claim.athlete_id, prescription.title as prescription_title
    into claim_record
    from public.training_claims claim
    join public.training_prescriptions prescription on prescription.id = claim.prescription_id
    where claim.id = new.claim_id and claim.status = 'SUBMITTED';

    if claim_record.athlete_id is not null then
      insert into public.notifications (
        recipient_user_id, type, event_key, title, body, target_path
      ) values (
        claim_record.athlete_id, 'CLAIM_REVIEWED', 'claim-reviewed:' || new.claim_id,
        'Training reviewed',
        left('Your ' || claim_record.prescription_title || ' training session has been reviewed.', 1000),
        '/dashboard/claims/' || new.claim_id
      ) on conflict (event_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger claim_validations_notify_domain_event
after update on public.claim_validations
for each row execute function public.notify_claim_validation();

create function public.notify_program_cancellation_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  program_record public.training_programs;
begin
  select * into program_record from public.training_programs where id = new.training_program_id;
  if program_record.id is not null and exists (
    select 1 from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = program_record.created_by and role.name = 'COACH'
  ) then
    insert into public.notifications (
      recipient_user_id, type, event_key, title, body, target_path
    ) values (
      program_record.created_by, 'PROGRAM_CANCELLATION_REQUESTED',
      'cancellation-requested:' || new.id,
      'Cancellation requested',
      left('An athlete requested to end ' || program_record.name || '.', 1000),
      '/dashboard/training/' || program_record.id
    ) on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger cancellation_requests_notify_created
after insert on public.training_program_cancellation_requests
for each row execute function public.notify_program_cancellation_request();

create function public.notify_program_cancellation_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  program_name text;
begin
  if old.status = 'PENDING' and new.status in ('APPROVED', 'DECLINED') then
    select name into program_name from public.training_programs where id = new.training_program_id;
    insert into public.notifications (
      recipient_user_id, type, event_key, title, body, target_path
    ) values (
      new.requested_by, 'PROGRAM_CANCELLATION_DECIDED',
      'cancellation-decided:' || new.id,
      case when new.status = 'APPROVED' then 'Cancellation request approved'
        else 'Cancellation request declined' end,
      left('Your request to end ' || program_name || ' was ' || lower(new.status) || '.', 1000),
      '/dashboard/training/' || new.training_program_id
    ) on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger cancellation_requests_notify_decided
after update of status on public.training_program_cancellation_requests
for each row execute function public.notify_program_cancellation_decision();

revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
revoke all on function public.notify_claim_validation() from public, anon, authenticated;
revoke all on function public.notify_program_cancellation_request() from public, anon, authenticated;
revoke all on function public.notify_program_cancellation_decision() from public, anon, authenticated;

commit;
