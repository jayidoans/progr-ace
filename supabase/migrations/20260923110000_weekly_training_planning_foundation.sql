begin;

alter table public.training_weeks
  add column planning_status text;

update public.training_weeks week
set planning_status = case
  when program.status = 'DRAFT' then 'DRAFT'
  else 'PUBLISHED'
end
from public.training_programs program
where program.id = week.training_program_id;

alter table public.training_weeks
  alter column planning_status set default 'DRAFT',
  alter column planning_status set not null,
  add constraint training_weeks_planning_status_check
    check (planning_status in ('DRAFT', 'PUBLISHED'));

create index training_weeks_program_planning_status_idx
  on public.training_weeks (training_program_id, planning_status, start_date);

create or replace function public.validate_training_program_race_boundary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  race_date date;
begin
  select race.event_date
  into race_date
  from public.athlete_race_goals goal
  join public.races race on race.id = goal.race_id
  where goal.id = new.race_goal_id;

  if race_date is null then
    raise exception 'Training program requires a valid race goal' using errcode = '23514';
  end if;
  if new.end_date > race_date then
    raise exception 'Training program cannot end after the race date' using errcode = '23514';
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.training_programs program
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    join public.races race on race.id = goal.race_id
    where program.end_date > race.event_date
  ) then
    raise exception 'Existing training program exceeds its race date boundary';
  end if;
end;
$$;

drop trigger if exists training_programs_validate_race_boundary on public.training_programs;
create trigger training_programs_validate_race_boundary
before insert or update of race_goal_id, start_date, end_date on public.training_programs
for each row execute function public.validate_training_program_race_boundary();

create or replace function public.protect_training_program_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Training program identity and provenance are immutable' using errcode = '23514';
  end if;

  if old.status = 'ARCHIVED' then
    raise exception 'Archived training programs are immutable' using errcode = '23514';
  end if;

  if old.status = 'PUBLISHED' and new.status not in ('PUBLISHED', 'ARCHIVED') then
    raise exception 'Published training programs cannot return to draft' using errcode = '23514';
  end if;

  if old.status <> 'DRAFT' and (
    new.race_goal_id is distinct from old.race_goal_id
    or new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
  ) then
    raise exception 'Published training program content is immutable' using errcode = '23514';
  end if;

  if old.status = 'DRAFT' and new.status = 'PUBLISHED' and not exists (
    select 1
    from public.training_weeks
    join public.training_prescriptions
      on training_prescriptions.training_week_id = training_weeks.id
    where training_weeks.training_program_id = old.id
  ) then
    raise exception 'A program needs at least one prescription before publishing'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.training_weeks
    where training_program_id = old.id
      and (start_date < new.start_date or end_date > new.end_date)
  ) then
    raise exception 'Program dates must contain every training week' using errcode = '23514';
  end if;

  if old.status = 'DRAFT' and new.status = 'PUBLISHED' then
    update public.training_weeks
    set planning_status = 'PUBLISHED'
    where training_program_id = old.id;
  end if;

  return new;
end;
$$;

grant update (planning_status) on table public.training_weeks to authenticated;

drop policy if exists "training_weeks_select_visible_program" on public.training_weeks;
create policy "training_weeks_select_visible_program"
on public.training_weeks
for select
to authenticated
using (
  exists (
    select 1
    from public.training_programs program
    where program.id = training_weeks.training_program_id
      and (
        training_weeks.planning_status = 'PUBLISHED'
        or public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = (select auth.uid()))
      )
  )
);

drop policy if exists "training_prescriptions_select_visible_program" on public.training_prescriptions;
create policy "training_prescriptions_select_visible_program"
on public.training_prescriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.training_weeks week
    join public.training_programs program on program.id = week.training_program_id
    where week.id = training_prescriptions.training_week_id
      and (
        week.planning_status = 'PUBLISHED'
        or public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = (select auth.uid()))
      )
  )
);

drop policy if exists "prescription_components_select_visible_program" on public.prescription_components;
create policy "prescription_components_select_visible_program"
on public.prescription_components
for select
to authenticated
using (
  exists (
    select 1
    from public.training_prescriptions prescription
    join public.training_weeks week on week.id = prescription.training_week_id
    join public.training_programs program on program.id = week.training_program_id
    where prescription.id = prescription_components.prescription_id
      and (
        week.planning_status = 'PUBLISHED'
        or public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = (select auth.uid()))
      )
  )
);

create function public.protect_claim_week_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.training_prescriptions prescription
    join public.training_weeks week on week.id = prescription.training_week_id
    where prescription.id = new.prescription_id
      and week.planning_status = 'PUBLISHED'
  ) then
    raise exception 'Claims require a published training week' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists training_claims_require_published_week on public.training_claims;
create trigger training_claims_require_published_week
before insert or update of prescription_id, status on public.training_claims
for each row execute function public.protect_claim_week_publication();

create or replace function public.get_authorized_program_claim_states(
  p_program_ids uuid[]
)
returns table (
  program_id uuid,
  prescription_id uuid,
  claim_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean;
  is_coach boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_program_ids is null
    or cardinality(p_program_ids) = 0
    or cardinality(p_program_ids) > 20
    or array_position(p_program_ids, null) is not null
  then
    raise exception 'Program selection is invalid' using errcode = '22023';
  end if;

  select
    coalesce(bool_or(roles.name = 'ADMIN'), false),
    coalesce(bool_or(roles.name = 'COACH'), false)
  into is_admin, is_coach
  from public.user_roles
  join public.roles on roles.id = user_roles.role_id
  where user_roles.user_id = current_user_id;

  if not is_admin and not is_coach then
    raise exception 'Program evaluation access is unavailable' using errcode = '42501';
  end if;

  return query
  select program.id, prescription.id, claim.status
  from public.training_programs program
  join public.training_weeks week on week.training_program_id = program.id
  join public.training_prescriptions prescription on prescription.training_week_id = week.id
  left join public.training_claims claim on claim.prescription_id = prescription.id
  where program.id = any(p_program_ids)
    and week.planning_status = 'PUBLISHED'
    and (is_admin or (is_coach and program.created_by = current_user_id));
end;
$$;

revoke all on function public.validate_training_program_race_boundary()
  from public, anon, authenticated;
revoke all on function public.protect_claim_week_publication()
  from public, anon, authenticated;

commit;
