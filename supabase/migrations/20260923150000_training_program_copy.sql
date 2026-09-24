begin;

create or replace function public.copy_training_program(
  p_source_program_id uuid,
  p_destination_race_goal_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  is_admin boolean := false;
  is_coach boolean := false;
  source_program public.training_programs;
  destination_goal public.athlete_race_goals;
  new_program_id uuid;
  source_week record;
  new_week_id uuid;
  source_prescription record;
  new_prescription_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select
    coalesce(bool_or(role.name = 'ADMIN'), false),
    coalesce(bool_or(role.name = 'COACH'), false)
  into is_admin, is_coach
  from public.user_roles user_role
  join public.roles role on role.id = user_role.role_id
  where user_role.user_id = actor_id;

  if not is_admin and not is_coach then
    raise exception 'Only a Coach or Admin can copy a training program' using errcode = '42501';
  end if;

  select * into source_program
  from public.training_programs
  where id = p_source_program_id
  for share;

  if source_program.id is null then
    raise exception 'The source training program was not found' using errcode = 'P0002';
  end if;

  if not is_admin and source_program.created_by <> actor_id then
    raise exception 'The source training program is not available' using errcode = '42501';
  end if;

  select * into destination_goal
  from public.athlete_race_goals
  where id = p_destination_race_goal_id
  for update;

  if destination_goal.id is null then
    raise exception 'The destination race goal was not found' using errcode = 'P0002';
  end if;

  if destination_goal.status <> 'ACTIVE' then
    raise exception 'A new training program requires an active race goal' using errcode = '23514';
  end if;

  if source_program.race_goal_id is null
    or not exists (
      select 1
      from public.athlete_race_goals source_goal
      where source_goal.id = source_program.race_goal_id
        and source_goal.race_id = destination_goal.race_id
    )
  then
    raise exception 'The source and destination race goals must belong to the same race' using errcode = '23514';
  end if;

  -- tracking_start_date is intentionally omitted. When M11.3 is present,
  -- its current_date default records destination adoption rather than copying
  -- the source Athlete's execution boundary.
  insert into public.training_programs (
    race_goal_id, name, description, start_date, end_date, created_by, status
  ) values (
    destination_goal.id,
    source_program.name,
    source_program.description,
    source_program.start_date,
    source_program.end_date,
    actor_id,
    'DRAFT'
  ) returning id into new_program_id;

  for source_week in
    select *
    from public.training_weeks
    where training_program_id = source_program.id
    order by week_number, start_date
  loop
    insert into public.training_weeks (
      training_program_id, week_number, phase, start_date, end_date, planning_status
    ) values (
      new_program_id,
      source_week.week_number,
      source_week.phase,
      source_week.start_date,
      source_week.end_date,
      'DRAFT'
    ) returning id into new_week_id;

    for source_prescription in
      select *
      from public.training_prescriptions
      where training_week_id = source_week.id
      order by scheduled_date, created_at, id
    loop
      insert into public.training_prescriptions (
        training_week_id, training_menu, scheduled_date, title, description
      ) values (
        new_week_id,
        source_prescription.training_menu,
        source_prescription.scheduled_date,
        source_prescription.title,
        source_prescription.description
      ) returning id into new_prescription_id;

      insert into public.prescription_components (
        prescription_id, sequence_order, component_type, target_distance_m,
        target_duration_sec, repetitions, distance_per_rep_m,
        recovery_duration_sec, target_pace_min_sec_per_km,
        target_pace_max_sec_per_km, instruction
      )
      select
        new_prescription_id, sequence_order, component_type, target_distance_m,
        target_duration_sec, repetitions, distance_per_rep_m,
        recovery_duration_sec, target_pace_min_sec_per_km,
        target_pace_max_sec_per_km, instruction
      from public.prescription_components
      where prescription_id = source_prescription.id
      order by sequence_order, id;
    end loop;
  end loop;

  return new_program_id;
end;
$$;

revoke all on function public.copy_training_program(uuid, uuid) from public, anon, authenticated;
grant execute on function public.copy_training_program(uuid, uuid) to authenticated;

commit;
