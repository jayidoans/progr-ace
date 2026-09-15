begin;

do $$
begin
  if exists (
    select 1 from public.training_claims
    where upper(coalesce(status, 'PENDING')) not in ('PENDING', 'CLAIMED', 'DRAFT', 'SUBMITTED')
  ) then
    raise exception 'Milestone 5 cannot map an existing training claim status';
  end if;
  if exists (
    select prescription_id from public.training_claims
    group by prescription_id having count(*) > 1
  ) then
    raise exception 'Milestone 5 requires an explicit plan for duplicate claims on one prescription';
  end if;
  if exists (
    select activity_id from public.claim_activities
    group by activity_id having count(*) > 1
  ) then
    raise exception 'Milestone 5 requires an explicit plan for activities used by multiple claims';
  end if;
  if exists (
    select 1
    from public.claim_activities ca
    join public.training_claims tc on tc.id = ca.training_claim_id
    join public.activities a on a.id = ca.activity_id
    where tc.athlete_id <> a.athlete_id
  ) then
    raise exception 'Milestone 5 found cross-athlete claim evidence';
  end if;
  if exists (
    select 1
    from public.training_claims tc
    join public.training_prescriptions tp on tp.id = tc.prescription_id
    join public.training_weeks tw on tw.id = tp.training_week_id
    join public.training_programs program on program.id = tw.training_program_id
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    where goal.athlete_id <> tc.athlete_id
  ) then
    raise exception 'Milestone 5 found a claim against another athlete prescription';
  end if;
  if exists (
    select 1 from public.training_claims tc
    where upper(coalesce(tc.status, 'PENDING')) in ('CLAIMED', 'SUBMITTED')
      and not exists (
        select 1 from public.claim_activities ca where ca.training_claim_id = tc.id
      )
  ) then
    raise exception 'Milestone 5 cannot migrate a submitted claim without evidence';
  end if;
end;
$$;

alter table public.training_claims rename column notes to athlete_note;
alter table public.training_claims add column submitted_at timestamptz;

update public.training_claims
set status = case
      when upper(coalesce(status, 'PENDING')) in ('CLAIMED', 'SUBMITTED') then 'SUBMITTED'
      else 'DRAFT'
    end,
    submitted_at = case
      when upper(coalesce(status, 'PENDING')) in ('CLAIMED', 'SUBMITTED')
        then coalesce(updated_at, created_at, now())
      else null
    end,
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, created_at, now());

alter table public.training_claims
  drop constraint training_claims_athlete_id_fkey,
  drop constraint training_claims_prescription_id_fkey,
  alter column status set default 'DRAFT',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint training_claims_athlete_id_fkey
    foreign key (athlete_id) references public.profiles(id) on delete restrict,
  add constraint training_claims_prescription_id_fkey
    foreign key (prescription_id) references public.training_prescriptions(id) on delete restrict,
  add constraint training_claims_status_check check (status in ('DRAFT', 'SUBMITTED')),
  add constraint training_claims_athlete_note_length_check check (
    athlete_note is null or char_length(athlete_note) <= 4000
  ),
  add constraint training_claims_submission_timestamp_check check (
    (status = 'DRAFT' and submitted_at is null)
    or (status = 'SUBMITTED' and submitted_at is not null)
  );

create unique index training_claims_one_per_prescription_idx
  on public.training_claims (prescription_id);
create index training_claims_athlete_status_idx
  on public.training_claims (athlete_id, status);

alter table public.claim_activities rename column training_claim_id to claim_id;
update public.claim_activities set created_at = coalesce(created_at, now());

alter table public.claim_activities
  drop constraint claim_activities_training_claim_id_fkey,
  drop constraint claim_activities_activity_id_fkey,
  alter column created_at set default now(),
  alter column created_at set not null,
  add constraint claim_activities_claim_id_fkey
    foreign key (claim_id) references public.training_claims(id) on delete restrict,
  add constraint claim_activities_activity_id_fkey
    foreign key (activity_id) references public.activities(id) on delete restrict;

create unique index claim_activities_activity_current_unique_idx
  on public.claim_activities (activity_id);

drop trigger if exists training_claims_set_updated_at on public.training_claims;
create trigger training_claims_set_updated_at
before update on public.training_claims
for each row execute function public.set_updated_at();

create or replace function public.protect_training_claim_lifecycle()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'SUBMITTED' then
    raise exception 'Submitted claims are immutable' using errcode = '23514';
  end if;
  if new.id is distinct from old.id
    or new.athlete_id is distinct from old.athlete_id
    or new.prescription_id is distinct from old.prescription_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Claim identity and audit fields are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists training_claims_protect_lifecycle on public.training_claims;
create trigger training_claims_protect_lifecycle
before update on public.training_claims
for each row execute function public.protect_training_claim_lifecycle();

create or replace function public.protect_claim_activity_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  target_claim public.training_claims;
  target_activity public.activities;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Claim evidence relationships cannot be updated; remove and add evidence instead'
      using errcode = '23514';
  end if;

  select * into target_claim
  from public.training_claims
  where id = coalesce(new.claim_id, old.claim_id)
  for update;

  if target_claim.id is null or target_claim.status <> 'DRAFT' then
    raise exception 'Claim evidence can only change while the claim is a draft'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    select * into target_activity from public.activities where id = new.activity_id;
    if target_activity.id is null or target_activity.athlete_id <> target_claim.athlete_id then
      raise exception 'Claim and activity ownership must match' using errcode = '42501';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists claim_activities_protect_mutation on public.claim_activities;
create trigger claim_activities_protect_mutation
before insert or update or delete on public.claim_activities
for each row execute function public.protect_claim_activity_mutation();

create or replace function public.protect_submitted_activity_evidence()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1
    from public.claim_activities ca
    join public.training_claims tc on tc.id = ca.claim_id
    where ca.activity_id = old.id and tc.status = 'SUBMITTED'
  ) then
    raise exception 'Submitted activity evidence is immutable' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists activities_protect_submitted_evidence on public.activities;
create trigger activities_protect_submitted_evidence
before update or delete on public.activities
for each row execute function public.protect_submitted_activity_evidence();

alter table public.training_claims enable row level security;
alter table public.training_claims force row level security;
alter table public.claim_activities enable row level security;
alter table public.claim_activities force row level security;

create policy "training_claims_select_own" on public.training_claims
for select to authenticated using (athlete_id = (select auth.uid()));

create policy "training_claims_insert_own_published_prescription" on public.training_claims
for insert to authenticated with check (
  athlete_id = (select auth.uid()) and status = 'DRAFT' and submitted_at is null
  and exists (
    select 1
    from public.training_prescriptions tp
    join public.training_weeks tw on tw.id = tp.training_week_id
    join public.training_programs program on program.id = tw.training_program_id
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    where tp.id = training_claims.prescription_id
      and program.status = 'PUBLISHED'
      and goal.athlete_id = (select auth.uid())
  )
);

create policy "training_claims_update_own_draft" on public.training_claims
for update to authenticated
using (athlete_id = (select auth.uid()) and status = 'DRAFT')
with check (athlete_id = (select auth.uid()) and status = 'DRAFT' and submitted_at is null);

create policy "training_claims_delete_own_draft" on public.training_claims
for delete to authenticated using (athlete_id = (select auth.uid()) and status = 'DRAFT');

create policy "claim_activities_select_own" on public.claim_activities
for select to authenticated using (
  exists (
    select 1 from public.training_claims tc
    where tc.id = claim_activities.claim_id and tc.athlete_id = (select auth.uid())
  )
  and exists (
    select 1 from public.activities a
    where a.id = claim_activities.activity_id and a.athlete_id = (select auth.uid())
  )
);

create policy "claim_activities_insert_own_draft" on public.claim_activities
for insert to authenticated with check (
  exists (
    select 1 from public.training_claims tc
    where tc.id = claim_activities.claim_id
      and tc.athlete_id = (select auth.uid()) and tc.status = 'DRAFT'
  )
  and exists (
    select 1 from public.activities a
    where a.id = claim_activities.activity_id and a.athlete_id = (select auth.uid())
  )
);

create policy "claim_activities_delete_own_draft" on public.claim_activities
for delete to authenticated using (
  exists (
    select 1 from public.training_claims tc
    where tc.id = claim_activities.claim_id
      and tc.athlete_id = (select auth.uid()) and tc.status = 'DRAFT'
  )
  and exists (
    select 1 from public.activities a
    where a.id = claim_activities.activity_id and a.athlete_id = (select auth.uid())
  )
);

drop policy "activities_update_own_manual" on public.activities;
create policy "activities_update_own_manual" on public.activities
for update to authenticated using (
  athlete_id = (select auth.uid()) and source = 'MANUAL'
)
with check (
  athlete_id = (select auth.uid()) and source = 'MANUAL'
  and external_activity_id is null and raw_data is null
);

drop policy "activities_delete_own_manual" on public.activities;
create policy "activities_delete_own_manual" on public.activities
for delete to authenticated using (
  athlete_id = (select auth.uid()) and source = 'MANUAL'
);

revoke all on table public.training_claims from public, anon, authenticated;
revoke all on table public.claim_activities from public, anon, authenticated;
grant select on table public.training_claims to authenticated;
grant insert (athlete_id, prescription_id, athlete_note) on public.training_claims to authenticated;
grant update (athlete_note) on public.training_claims to authenticated;
grant delete on table public.training_claims to authenticated;
grant select on table public.claim_activities to authenticated;
grant insert (claim_id, activity_id) on public.claim_activities to authenticated;
grant delete on table public.claim_activities to authenticated;

create or replace function public.create_training_claim_draft(
  p_prescription_id uuid,
  p_activity_ids uuid[],
  p_athlete_note text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_claim_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_activity_ids), 0) = 0 or array_position(p_activity_ids, null) is not null then
    raise exception 'Select at least one activity' using errcode = '22023';
  end if;
  if cardinality(p_activity_ids) <> (
    select count(distinct activity_id)::integer from unnest(p_activity_ids) activity_id
  ) then
    raise exception 'Duplicate activity evidence is not allowed' using errcode = '23505';
  end if;

  insert into public.training_claims (athlete_id, prescription_id, athlete_note)
  values (auth.uid(), p_prescription_id, nullif(trim(p_athlete_note), ''))
  returning id into new_claim_id;

  insert into public.claim_activities (claim_id, activity_id)
  select new_claim_id, activity_id from unnest(p_activity_ids) activity_id;
  return new_claim_id;
end;
$$;

create or replace function public.submit_training_claim(p_claim_id uuid)
returns public.training_claims
language plpgsql security definer set search_path = '' as $$
declare
  current_claim public.training_claims;
  submitted_claim public.training_claims;
  eligible_program_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select * into current_claim from public.training_claims where id = p_claim_id for update;
  if current_claim.id is null or current_claim.athlete_id <> auth.uid() then
    raise exception 'Claim was not found' using errcode = 'P0002';
  end if;
  if current_claim.status <> 'DRAFT' then
    raise exception 'Only a draft claim can be submitted' using errcode = '23514';
  end if;
  select program.id
  into eligible_program_id
    from public.training_prescriptions tp
    join public.training_weeks tw on tw.id = tp.training_week_id
    join public.training_programs program on program.id = tw.training_program_id
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    where tp.id = current_claim.prescription_id
      and program.status = 'PUBLISHED' and goal.athlete_id = current_claim.athlete_id
    for key share of program;
  if eligible_program_id is null then
    raise exception 'The prescription is not eligible for submission' using errcode = '42501';
  end if;
  if not exists (select 1 from public.claim_activities ca where ca.claim_id = current_claim.id) then
    raise exception 'A submitted claim requires evidence' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.claim_activities ca
    join public.activities a on a.id = ca.activity_id
    where ca.claim_id = current_claim.id and a.athlete_id <> current_claim.athlete_id
  ) then
    raise exception 'Claim evidence ownership is invalid' using errcode = '42501';
  end if;

  update public.training_claims
  set status = 'SUBMITTED', submitted_at = now()
  where id = current_claim.id
  returning * into submitted_claim;
  return submitted_claim;
end;
$$;

create or replace function public.delete_training_claim_draft(p_claim_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  delete from public.claim_activities where claim_id = p_claim_id;
  delete from public.training_claims
  where id = p_claim_id and athlete_id = auth.uid() and status = 'DRAFT';
  if not found then
    raise exception 'Draft claim was not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.protect_training_claim_lifecycle() from public, anon, authenticated;
revoke execute on function public.protect_claim_activity_mutation() from public, anon, authenticated;
revoke execute on function public.protect_submitted_activity_evidence() from public, anon, authenticated;
revoke execute on function public.create_training_claim_draft(uuid, uuid[], text) from public, anon;
grant execute on function public.create_training_claim_draft(uuid, uuid[], text) to authenticated;
revoke execute on function public.submit_training_claim(uuid) from public, anon;
grant execute on function public.submit_training_claim(uuid) to authenticated;
revoke execute on function public.delete_training_claim_draft(uuid) from public, anon;
grant execute on function public.delete_training_claim_draft(uuid) to authenticated;

commit;
