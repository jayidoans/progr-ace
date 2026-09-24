begin;

alter table public.training_programs
  drop constraint training_programs_status_check,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete restrict,
  add column cancellation_reason text,
  add constraint training_programs_status_check
    check (status in ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED')),
  add constraint training_programs_cancellation_audit_check check (
    (status = 'CANCELLED'
      and cancelled_at is not null and cancelled_by is not null
      and cancellation_reason is not null
      and length(trim(cancellation_reason)) between 1 and 1000)
    or
    (status <> 'CANCELLED'
      and cancelled_at is null and cancelled_by is null and cancellation_reason is null)
  );

create table public.training_program_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  training_program_id uuid not null references public.training_programs(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  request_reason text not null check (length(trim(request_reason)) between 1 and 1000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'DECLINED')),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  review_reason text check (review_reason is null or length(trim(review_reason)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_program_cancellation_requests_review_check check (
    (status = 'PENDING' and reviewed_by is null and reviewed_at is null and review_reason is null)
    or (status in ('APPROVED', 'DECLINED') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index training_program_cancellation_requests_program_idx
  on public.training_program_cancellation_requests (training_program_id, requested_at desc);
create unique index training_program_cancellation_requests_one_pending_idx
  on public.training_program_cancellation_requests (training_program_id)
  where status = 'PENDING';

alter table public.training_program_cancellation_requests enable row level security;
alter table public.training_program_cancellation_requests force row level security;
revoke all on table public.training_program_cancellation_requests from public, anon, authenticated;
grant select on table public.training_program_cancellation_requests to authenticated;

create policy "training_program_cancellation_requests_select_authorized"
on public.training_program_cancellation_requests for select to authenticated
using (
  exists (
    select 1
    from public.training_programs program
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    where program.id = training_program_cancellation_requests.training_program_id
      and (
        public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = (select auth.uid()))
        or (public.has_role('ATHLETE') and goal.athlete_id = (select auth.uid()))
      )
  )
);

drop policy "training_programs_select_author_or_published_athlete" on public.training_programs;
create policy "training_programs_select_author_or_active_history_athlete"
on public.training_programs for select to authenticated
using (
  public.has_role('ADMIN')
  or (public.has_role('COACH') and created_by = (select auth.uid()))
  or (
    status in ('PUBLISHED', 'CANCELLED')
    and exists (
      select 1 from public.athlete_race_goals goal
      where goal.id = training_programs.race_goal_id
        and goal.athlete_id = (select auth.uid())
    )
  )
);

create trigger training_program_cancellation_requests_set_updated_at
before update on public.training_program_cancellation_requests
for each row execute function public.set_updated_at();

create function public.protect_training_program_cancellation_request()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.training_program_id is distinct from old.training_program_id
    or new.requested_by is distinct from old.requested_by
    or new.requested_at is distinct from old.requested_at
    or new.request_reason is distinct from old.request_reason
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cancellation request identity and provenance are immutable' using errcode = '23514';
  end if;
  if old.status <> 'PENDING' then
    raise exception 'Reviewed cancellation requests are immutable' using errcode = '23514';
  end if;
  if new.status not in ('APPROVED', 'DECLINED') then
    raise exception 'A pending cancellation request requires a review decision' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger training_program_cancellation_requests_protect
before update on public.training_program_cancellation_requests
for each row execute function public.protect_training_program_cancellation_request();

create or replace function public.protect_training_program_lifecycle()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  race_date date;
  goal_is_active boolean;
  is_authorized_race_date_extension boolean := false;
begin
  if new.id is distinct from old.id or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Training program identity and provenance are immutable' using errcode = '23514';
  end if;
  if old.status in ('ARCHIVED', 'CANCELLED') then
    raise exception 'Terminal training programs are immutable' using errcode = '23514';
  end if;
  if new.status = 'CANCELLED' then
    if old.status <> 'PUBLISHED' or new.cancelled_at is null or new.cancelled_by is null
      or nullif(trim(new.cancellation_reason), '') is null
    then
      raise exception 'Only a published training program can be cancelled with complete audit data'
        using errcode = '23514';
    end if;
  elsif new.cancelled_at is distinct from old.cancelled_at
    or new.cancelled_by is distinct from old.cancelled_by
    or new.cancellation_reason is distinct from old.cancellation_reason
  then
    raise exception 'Cancellation audit data is immutable' using errcode = '23514';
  end if;
  if old.status = 'PUBLISHED' and new.status not in ('PUBLISHED', 'CANCELLED', 'ARCHIVED') then
    raise exception 'Published training programs cannot return to draft' using errcode = '23514';
  end if;

  if old.status = 'PUBLISHED' and new.status = 'PUBLISHED'
    and new.race_goal_id is not distinct from old.race_goal_id
    and new.name is not distinct from old.name and new.description is not distinct from old.description
    and new.start_date is not distinct from old.start_date and new.end_date > old.end_date
    and extract(isodow from old.end_date) = 7
  then
    select race.event_date, goal.status = 'ACTIVE' into race_date, goal_is_active
    from public.athlete_race_goals goal join public.races race on race.id = goal.race_id
    where goal.id = old.race_goal_id;
    is_authorized_race_date_extension := goal_is_active and new.end_date = race_date;
  end if;

  if old.status <> 'DRAFT' and (
    new.race_goal_id is distinct from old.race_goal_id or new.name is distinct from old.name
    or new.description is distinct from old.description or new.start_date is distinct from old.start_date
    or (new.end_date is distinct from old.end_date and not is_authorized_race_date_extension)
  ) then
    raise exception 'Published training program content is immutable' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.training_weeks
    where training_program_id = old.id and (start_date < new.start_date or end_date > new.end_date)
  ) then
    raise exception 'Program dates must contain every training week' using errcode = '23514';
  end if;
  if old.status = 'DRAFT' and new.status = 'PUBLISHED' then
    update public.training_weeks set planning_status = 'PUBLISHED' where training_program_id = old.id;
  end if;
  return new;
end;
$$;

create function public.can_manage_training_program_cancellation(p_program_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.training_programs program
    where program.id = p_program_id
      and (public.has_role('ADMIN') or (public.has_role('COACH') and program.created_by = auth.uid()))
  );
$$;

create function public.request_training_program_cancellation(p_program_id uuid, p_request_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  program_record public.training_programs;
  request_id uuid;
  normalized_reason text := nullif(trim(p_request_reason), '');
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if normalized_reason is null or length(normalized_reason) > 1000 then
    raise exception 'A cancellation reason is required' using errcode = '22023';
  end if;
  select program.* into program_record from public.training_programs program
  where program.id = p_program_id for update;
  if program_record.id is null or program_record.status <> 'PUBLISHED' or not public.has_role('ATHLETE')
    or not exists (
      select 1 from public.athlete_race_goals goal
      where goal.id = program_record.race_goal_id and goal.athlete_id = auth.uid()
    )
  then
    raise exception 'Program cancellation request is unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.training_program_cancellation_requests request
    where request.training_program_id = program_record.id and request.status = 'PENDING'
  ) then
    raise exception 'A cancellation request is already pending' using errcode = '23505';
  end if;
  insert into public.training_program_cancellation_requests (training_program_id, requested_by, request_reason)
  values (program_record.id, auth.uid(), normalized_reason) returning id into request_id;
  return request_id;
end;
$$;

create function public.review_training_program_cancellation(
  p_request_id uuid, p_decision text, p_review_reason text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  request_program_id uuid;
  request_record public.training_program_cancellation_requests;
  program_record public.training_programs;
  normalized_review_reason text := nullif(trim(p_review_reason), '');
  review_time timestamptz := statement_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if p_decision not in ('APPROVED', 'DECLINED') then
    raise exception 'Review decision must be APPROVED or DECLINED' using errcode = '22023';
  end if;
  if normalized_review_reason is not null and length(normalized_review_reason) > 1000 then
    raise exception 'Review reason is too long' using errcode = '22023';
  end if;
  select request.training_program_id into request_program_id
  from public.training_program_cancellation_requests request where request.id = p_request_id;
  select program.* into program_record from public.training_programs program
  where program.id = request_program_id for update;
  select request.* into request_record from public.training_program_cancellation_requests request
  where request.id = p_request_id for update;
  if request_record.id is null or program_record.id is null or request_record.status <> 'PENDING'
    or program_record.status <> 'PUBLISHED'
    or not public.can_manage_training_program_cancellation(program_record.id)
  then
    raise exception 'Cancellation request review is unavailable' using errcode = '42501';
  end if;
  update public.training_program_cancellation_requests
  set status = p_decision, reviewed_by = auth.uid(), reviewed_at = review_time,
      review_reason = normalized_review_reason
  where id = request_record.id;
  if p_decision = 'APPROVED' then
    update public.training_programs
    set status = 'CANCELLED', cancelled_at = review_time, cancelled_by = auth.uid(),
        cancellation_reason = request_record.request_reason
    where id = program_record.id;
  end if;
  return request_record.id;
end;
$$;

create function public.cancel_training_program(p_program_id uuid, p_cancellation_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  program_record public.training_programs;
  normalized_reason text := nullif(trim(p_cancellation_reason), '');
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if normalized_reason is null or length(normalized_reason) > 1000 then
    raise exception 'A cancellation reason is required' using errcode = '22023';
  end if;
  select program.* into program_record from public.training_programs program
  where program.id = p_program_id for update;
  if program_record.id is null or program_record.status <> 'PUBLISHED'
    or not public.can_manage_training_program_cancellation(program_record.id)
  then
    raise exception 'Direct Program cancellation is unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.training_program_cancellation_requests request
    where request.training_program_id = program_record.id and request.status = 'PENDING'
  ) then
    raise exception 'Review the pending Athlete cancellation request before direct cancellation'
      using errcode = '23514';
  end if;
  update public.training_programs
  set status = 'CANCELLED', cancelled_at = statement_timestamp(), cancelled_by = auth.uid(),
      cancellation_reason = normalized_reason
  where id = program_record.id;
  return program_record.id;
end;
$$;

create function public.delete_draft_training_program(p_program_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare program_record public.training_programs;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select program.* into program_record from public.training_programs program
  where program.id = p_program_id for update;
  if program_record.id is null or program_record.status <> 'DRAFT'
    or not public.can_manage_training_program_cancellation(program_record.id)
  then
    raise exception 'Draft Program deletion is unavailable' using errcode = '42501';
  end if;
  update public.training_import_previews set imported_program_id = null
  where imported_program_id = program_record.id;
  delete from public.training_programs where id = program_record.id;
  return program_record.id;
end;
$$;

revoke delete on table public.training_programs from authenticated;
revoke all on function public.protect_training_program_cancellation_request() from public, anon, authenticated;
revoke all on function public.can_manage_training_program_cancellation(uuid) from public, anon, authenticated;
revoke all on function public.request_training_program_cancellation(uuid, text) from public, anon;
revoke all on function public.review_training_program_cancellation(uuid, text, text) from public, anon;
revoke all on function public.cancel_training_program(uuid, text) from public, anon;
revoke all on function public.delete_draft_training_program(uuid) from public, anon;
grant execute on function public.request_training_program_cancellation(uuid, text) to authenticated;
grant execute on function public.review_training_program_cancellation(uuid, text, text) to authenticated;
grant execute on function public.cancel_training_program(uuid, text) to authenticated;
grant execute on function public.delete_draft_training_program(uuid) to authenticated;

commit;
