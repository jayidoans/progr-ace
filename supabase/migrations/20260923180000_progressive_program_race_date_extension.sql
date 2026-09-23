begin;

-- A published progressive Program normally remains immutable. This narrow
-- exception allows its author to deliberately resume weekly planning through
-- the authoritative Race Date, without changing any existing week/session.
create or replace function public.protect_training_program_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  race_date date;
  goal_is_active boolean;
  is_authorized_race_date_extension boolean := false;
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

  if old.status = 'PUBLISHED'
    and new.status = 'PUBLISHED'
    and new.race_goal_id is not distinct from old.race_goal_id
    and new.name is not distinct from old.name
    and new.description is not distinct from old.description
    and new.start_date is not distinct from old.start_date
    and new.end_date > old.end_date
    and extract(isodow from old.end_date) = 7
  then
    select race.event_date, goal.status = 'ACTIVE'
    into race_date, goal_is_active
    from public.athlete_race_goals goal
    join public.races race on race.id = goal.race_id
    where goal.id = old.race_goal_id;

    is_authorized_race_date_extension := goal_is_active
      and new.end_date = race_date;
  end if;

  if old.status <> 'DRAFT' and (
    new.race_goal_id is distinct from old.race_goal_id
    or new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.start_date is distinct from old.start_date
    or (
      new.end_date is distinct from old.end_date
      and not is_authorized_race_date_extension
    )
  ) then
    raise exception 'Published training program content is immutable' using errcode = '23514';
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

create function public.extend_and_start_next_training_week(p_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_record public.training_programs;
  race_date date;
  goal_status text;
  next_week_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select program.*
  into program_record
  from public.training_programs program
  where program.id = p_program_id
  for update;

  if program_record.id is null
    or not public.can_manage_progressive_training_program(p_program_id)
  then
    raise exception 'Weekly planning is unavailable' using errcode = '42501';
  end if;

  select race.event_date, goal.status
  into race_date, goal_status
  from public.athlete_race_goals goal
  join public.races race on race.id = goal.race_id
  where goal.id = program_record.race_goal_id;

  if goal_status <> 'ACTIVE'
    or race_date is null
    or program_record.end_date >= race_date
    or extract(isodow from program_record.end_date) <> 7
  then
    raise exception 'The program cannot be extended to Race Day' using errcode = '22023';
  end if;

  update public.training_programs
  set end_date = race_date
  where id = program_record.id;

  select public.start_training_week_plan(
    program_record.id,
    program_record.end_date + 1,
    'Weekly plan'
  ) into next_week_id;

  return next_week_id;
end;
$$;

revoke all on function public.extend_and_start_next_training_week(uuid)
  from public, anon;
grant execute on function public.extend_and_start_next_training_week(uuid)
  to authenticated;

commit;
