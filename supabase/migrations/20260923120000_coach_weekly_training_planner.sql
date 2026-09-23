begin;

-- A progressive plan may include a partial first or final calendar week.
-- Row constraints keep the interval inside one calendar week; the trigger
-- below additionally clamps it to the authoritative program boundary.
alter table public.training_weeks
  drop constraint training_weeks_date_order_check,
  drop constraint training_weeks_monday_start_check,
  drop constraint training_weeks_sunday_end_check,
  add constraint training_weeks_date_order_check
    check (end_date >= start_date and end_date <= start_date + 6),
  add constraint training_weeks_single_calendar_week_check
    check (date_trunc('week', start_date::timestamp)::date = date_trunc('week', end_date::timestamp)::date),
  add constraint training_weeks_program_start_key unique (training_program_id, start_date);

create or replace function public.validate_training_week_dates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  program_start date;
  program_end date;
  calendar_monday date;
begin
  select start_date, end_date
  into program_start, program_end
  from public.training_programs
  where id = new.training_program_id;

  calendar_monday := new.start_date - (extract(isodow from new.start_date)::integer - 1);
  if program_start is null
    or new.start_date <> greatest(program_start, calendar_monday)
    or new.end_date <> least(program_end, calendar_monday + 6)
  then
    raise exception 'Training week must match its calendar week within program dates'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists training_weeks_validate_dates on public.training_weeks;
create trigger training_weeks_validate_dates
before insert or update on public.training_weeks
for each row execute function public.validate_training_week_dates();

create function public.can_manage_progressive_training_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.training_programs program
    where program.id = p_program_id
      and program.status = 'PUBLISHED'
      and (
        public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = auth.uid())
      )
  );
$$;

create function public.start_training_week_plan(
  p_program_id uuid,
  p_week_date date,
  p_phase text default 'Weekly plan'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_record public.training_programs;
  calendar_monday date;
  program_calendar_monday date;
  week_start date;
  week_end date;
  derived_week_number integer;
  week_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select * into program_record
  from public.training_programs
  where id = p_program_id
  for update;

  if program_record.id is null
    or not public.can_manage_progressive_training_program(p_program_id)
  then
    raise exception 'Weekly planning is unavailable' using errcode = '42501';
  end if;
  if p_week_date < program_record.start_date or p_week_date > program_record.end_date then
    raise exception 'Selected week is outside the training program' using errcode = '22023';
  end if;

  calendar_monday := p_week_date - (extract(isodow from p_week_date)::integer - 1);
  program_calendar_monday := program_record.start_date
    - (extract(isodow from program_record.start_date)::integer - 1);
  week_start := greatest(program_record.start_date, calendar_monday);
  week_end := least(program_record.end_date, calendar_monday + 6);
  derived_week_number := ((calendar_monday - program_calendar_monday) / 7) + 1;

  insert into public.training_weeks (
    training_program_id, week_number, phase, start_date, end_date, planning_status
  ) values (
    p_program_id,
    derived_week_number,
    coalesce(nullif(trim(p_phase), ''), 'Weekly plan'),
    week_start,
    week_end,
    'DRAFT'
  )
  on conflict (training_program_id, week_number) do nothing
  returning id into week_id;

  if week_id is null then
    select id into week_id
    from public.training_weeks
    where training_program_id = p_program_id
      and week_number = derived_week_number
      and start_date = week_start
      and end_date = week_end;
  end if;
  if week_id is null then
    raise exception 'The training week conflicts with an existing week' using errcode = '23505';
  end if;
  return week_id;
end;
$$;

create function public.insert_weekly_planner_components(
  p_prescription_id uuid,
  p_components jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  component_count integer;
begin
  if jsonb_typeof(p_components) <> 'array' then
    raise exception 'Workout details must be an array' using errcode = '22023';
  end if;
  component_count := jsonb_array_length(p_components);
  if component_count < 1 or component_count > 20 then
    raise exception 'A training session requires between 1 and 20 components' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_components) as item(
      component_type text, target_distance_m integer, target_duration_sec integer,
      repetitions integer, distance_per_rep_m integer, recovery_duration_sec integer,
      target_pace_min_sec_per_km integer, target_pace_max_sec_per_km integer,
      instruction text
    )
    where component_type not in (
      'EASY', 'INTERVAL', 'TEMPO', 'FARTLEK', 'STRIDES', 'RACE_PACE',
      'REPETITIONS', 'STRENGTH', 'MEDIUM', 'LONG', 'OTHER'
    )
      or (
        target_distance_m is null and target_duration_sec is null
        and repetitions is null and distance_per_rep_m is null
        and recovery_duration_sec is null and target_pace_min_sec_per_km is null
        and target_pace_max_sec_per_km is null and nullif(trim(instruction), '') is null
      )
  ) then
    raise exception 'Workout component details are invalid' using errcode = '22023';
  end if;

  insert into public.prescription_components (
    prescription_id, sequence_order, component_type, target_distance_m,
    target_duration_sec, repetitions, distance_per_rep_m, recovery_duration_sec,
    target_pace_min_sec_per_km, target_pace_max_sec_per_km, instruction
  )
  select
    p_prescription_id,
    item.ordinality::integer,
    item.value ->> 'component_type',
    nullif(item.value ->> 'target_distance_m', '')::integer,
    nullif(item.value ->> 'target_duration_sec', '')::integer,
    nullif(item.value ->> 'repetitions', '')::integer,
    nullif(item.value ->> 'distance_per_rep_m', '')::integer,
    nullif(item.value ->> 'recovery_duration_sec', '')::integer,
    nullif(item.value ->> 'target_pace_min_sec_per_km', '')::integer,
    nullif(item.value ->> 'target_pace_max_sec_per_km', '')::integer,
    nullif(trim(item.value ->> 'instruction'), '')
  from jsonb_array_elements(p_components) with ordinality as item(value, ordinality);
end;
$$;

create function public.create_draft_week_prescription(
  p_week_id uuid,
  p_training_menu text,
  p_scheduled_date date,
  p_title text,
  p_description text,
  p_components jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_id uuid;
  week_status text;
  prescription_id uuid;
begin
  select week.training_program_id, week.planning_status
  into program_id, week_status
  from public.training_weeks week
  where week.id = p_week_id
  for update;
  if program_id is null or week_status <> 'DRAFT'
    or not public.can_manage_progressive_training_program(program_id)
  then
    raise exception 'Draft training session changes are unavailable' using errcode = '42501';
  end if;

  insert into public.training_prescriptions (
    training_week_id, training_menu, scheduled_date, title, description
  ) values (
    p_week_id, p_training_menu, p_scheduled_date, trim(p_title), nullif(trim(p_description), '')
  ) returning id into prescription_id;
  perform public.insert_weekly_planner_components(prescription_id, p_components);
  return prescription_id;
end;
$$;

create function public.update_draft_week_prescription(
  p_prescription_id uuid,
  p_training_menu text,
  p_scheduled_date date,
  p_title text,
  p_description text,
  p_components jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_id uuid;
  week_status text;
begin
  select week.training_program_id, week.planning_status
  into program_id, week_status
  from public.training_prescriptions prescription
  join public.training_weeks week on week.id = prescription.training_week_id
  where prescription.id = p_prescription_id
  for update of prescription, week;
  if program_id is null or week_status <> 'DRAFT'
    or not public.can_manage_progressive_training_program(program_id)
  then
    raise exception 'Draft training session changes are unavailable' using errcode = '42501';
  end if;

  update public.training_prescriptions
  set training_menu = p_training_menu,
      scheduled_date = p_scheduled_date,
      title = trim(p_title),
      description = nullif(trim(p_description), '')
  where id = p_prescription_id;
  delete from public.prescription_components where prescription_id = p_prescription_id;
  perform public.insert_weekly_planner_components(p_prescription_id, p_components);
  return p_prescription_id;
end;
$$;

create function public.delete_draft_week_prescription(p_prescription_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_id uuid;
  week_status text;
begin
  select week.training_program_id, week.planning_status
  into program_id, week_status
  from public.training_prescriptions prescription
  join public.training_weeks week on week.id = prescription.training_week_id
  where prescription.id = p_prescription_id
  for update of prescription, week;
  if program_id is null or week_status <> 'DRAFT'
    or not public.can_manage_progressive_training_program(program_id)
  then
    raise exception 'Draft training session changes are unavailable' using errcode = '42501';
  end if;
  delete from public.training_prescriptions where id = p_prescription_id;
  return p_prescription_id;
end;
$$;

create function public.publish_training_week(p_week_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_id uuid;
  week_status text;
begin
  select week.training_program_id, week.planning_status
  into program_id, week_status
  from public.training_weeks week
  where week.id = p_week_id
  for update;
  if program_id is null or not public.can_manage_progressive_training_program(program_id) then
    raise exception 'Week publication is unavailable' using errcode = '42501';
  end if;
  if week_status = 'PUBLISHED' then
    return p_week_id;
  end if;
  if week_status <> 'DRAFT' then
    raise exception 'Only a draft week can be published' using errcode = '22023';
  end if;
  if not exists (select 1 from public.training_prescriptions where training_week_id = p_week_id) then
    raise exception 'Add at least one training session before publishing this week'
      using errcode = '23514';
  end if;
  update public.training_weeks set planning_status = 'PUBLISHED' where id = p_week_id;
  return p_week_id;
end;
$$;

revoke all on function public.validate_training_week_dates() from public, anon, authenticated;
revoke all on function public.can_manage_progressive_training_program(uuid) from public, anon, authenticated;
revoke all on function public.insert_weekly_planner_components(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_training_week_plan(uuid, date, text) from public, anon;
revoke all on function public.create_draft_week_prescription(uuid, text, date, text, text, jsonb) from public, anon;
revoke all on function public.update_draft_week_prescription(uuid, text, date, text, text, jsonb) from public, anon;
revoke all on function public.delete_draft_week_prescription(uuid) from public, anon;
revoke all on function public.publish_training_week(uuid) from public, anon;

grant execute on function public.start_training_week_plan(uuid, date, text) to authenticated;
grant execute on function public.create_draft_week_prescription(uuid, text, date, text, text, jsonb) to authenticated;
grant execute on function public.update_draft_week_prescription(uuid, text, date, text, text, jsonb) to authenticated;
grant execute on function public.delete_draft_week_prescription(uuid) to authenticated;
grant execute on function public.publish_training_week(uuid) to authenticated;

commit;
