begin;

-- A consumed preview is no longer eligible for the UPDATE policy used by
-- SELECT ... FOR UPDATE. Read it first so repeat confirmations can return the
-- original program, then lock only an unconsumed preview before mutation.
create or replace function public.confirm_training_import(p_preview_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  preview_record public.training_import_previews;
  program_id uuid;
  week_id uuid;
  prescription_id uuid;
  week_json jsonb;
  prescription_json jsonb;
  component_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(auth.uid()::text || ':' || p_preview_id::text, 0)
  );

  select * into preview_record
  from public.training_import_previews
  where id = p_preview_id
    and created_by = auth.uid();

  if preview_record.id is null then
    raise exception 'Training import preview was not found' using errcode = 'P0002';
  end if;

  if preview_record.imported_program_id is not null then
    return preview_record.imported_program_id;
  end if;

  select * into preview_record
  from public.training_import_previews
  where id = p_preview_id
    and created_by = auth.uid()
    and imported_program_id is null
  for update;

  if preview_record.id is null then
    raise exception 'Training import preview could not be locked' using errcode = '40001';
  end if;

  if preview_record.expires_at <= now() then
    raise exception 'Training import preview has expired' using errcode = '22023';
  end if;

  if preview_record.template_version <> 1
    or jsonb_typeof(preview_record.payload -> 'weeks') <> 'array'
    or jsonb_array_length(preview_record.payload -> 'weeks') = 0
    or jsonb_array_length(preview_record.payload -> 'weeks') > 52
  then
    raise exception 'Training import preview payload is invalid' using errcode = '22023';
  end if;

  insert into public.training_programs (
    race_goal_id,
    name,
    description,
    start_date,
    end_date,
    created_by,
    status
  )
  values (
    preview_record.race_goal_id,
    preview_record.payload ->> 'name',
    nullif(preview_record.payload ->> 'description', ''),
    (preview_record.payload ->> 'startDate')::date,
    (preview_record.payload ->> 'endDate')::date,
    auth.uid(),
    'DRAFT'
  )
  returning id into program_id;

  for week_json in
    select value from jsonb_array_elements(preview_record.payload -> 'weeks')
  loop
    insert into public.training_weeks (
      training_program_id,
      week_number,
      phase,
      start_date,
      end_date
    )
    values (
      program_id,
      (week_json ->> 'weekNumber')::integer,
      week_json ->> 'phase',
      (week_json ->> 'startDate')::date,
      (week_json ->> 'endDate')::date
    )
    returning id into week_id;

    for prescription_json in
      select value from jsonb_array_elements(week_json -> 'prescriptions')
    loop
      insert into public.training_prescriptions (
        training_week_id,
        training_menu,
        scheduled_date,
        title,
        description
      )
      values (
        week_id,
        prescription_json ->> 'trainingMenu',
        (prescription_json ->> 'scheduledDate')::date,
        prescription_json ->> 'title',
        nullif(prescription_json ->> 'description', '')
      )
      returning id into prescription_id;

      for component_json in
        select value from jsonb_array_elements(prescription_json -> 'components')
      loop
        insert into public.prescription_components (
          prescription_id,
          sequence_order,
          component_type,
          target_distance_m,
          target_duration_sec,
          repetitions,
          distance_per_rep_m,
          recovery_duration_sec,
          target_pace_min_sec_per_km,
          target_pace_max_sec_per_km,
          instruction
        )
        values (
          prescription_id,
          (component_json ->> 'sequenceOrder')::integer,
          component_json ->> 'componentType',
          nullif(component_json ->> 'targetDistanceM', '')::integer,
          nullif(component_json ->> 'targetDurationSec', '')::integer,
          nullif(component_json ->> 'repetitions', '')::integer,
          nullif(component_json ->> 'distancePerRepM', '')::integer,
          nullif(component_json ->> 'recoveryDurationSec', '')::integer,
          nullif(component_json ->> 'targetPaceMinSecPerKm', '')::integer,
          nullif(component_json ->> 'targetPaceMaxSecPerKm', '')::integer,
          nullif(component_json ->> 'instruction', '')
        );
      end loop;
    end loop;
  end loop;

  update public.training_import_previews
  set imported_program_id = program_id
  where id = preview_record.id;

  return program_id;
end;
$$;

revoke execute on function public.confirm_training_import(uuid) from public, anon;
grant execute on function public.confirm_training_import(uuid) to authenticated;

commit;
