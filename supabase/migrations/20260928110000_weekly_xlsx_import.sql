begin;

create function public.import_draft_training_week(p_week_id uuid, p_week jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  week_record public.training_weeks;
  prescription jsonb;
  prescription_id uuid;
  imported_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select * into week_record
  from public.training_weeks
  where id = p_week_id
  for update;

  if week_record.id is null
    or week_record.planning_status <> 'DRAFT'
    or not public.can_manage_progressive_training_program(week_record.training_program_id)
  then
    raise exception 'Weekly XLSX import is unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.training_prescriptions
    where training_week_id = week_record.id
  ) then
    raise exception 'Draft week already contains training sessions' using errcode = '23505';
  end if;

  if jsonb_typeof(p_week) <> 'object'
    or jsonb_typeof(p_week -> 'prescriptions') <> 'array'
    or jsonb_array_length(p_week -> 'prescriptions') < 1
    or jsonb_array_length(p_week -> 'prescriptions') > 500
    or nullif(p_week ->> 'week_number', '')::integer is distinct from week_record.week_number
    or nullif(p_week ->> 'start_date', '')::date is distinct from week_record.start_date
    or nullif(p_week ->> 'end_date', '')::date is distinct from week_record.end_date
    or nullif(trim(p_week ->> 'phase'), '') is null
    or char_length(p_week ->> 'phase') > 80
  then
    raise exception 'Weekly XLSX payload does not match the selected week' using errcode = '22023';
  end if;

  update public.training_weeks
  set phase = trim(p_week ->> 'phase')
  where id = week_record.id;

  for prescription in
    select value from jsonb_array_elements(p_week -> 'prescriptions')
  loop
    if jsonb_typeof(prescription) <> 'object'
      or jsonb_typeof(prescription -> 'components') <> 'array'
      or (prescription ->> 'scheduled_date')::date < week_record.start_date
      or (prescription ->> 'scheduled_date')::date > week_record.end_date
    then
      raise exception 'Imported training session is outside the selected week' using errcode = '22023';
    end if;

    insert into public.training_prescriptions (
      training_week_id,
      training_menu,
      scheduled_date,
      title,
      description
    ) values (
      week_record.id,
      prescription ->> 'training_menu',
      (prescription ->> 'scheduled_date')::date,
      trim(prescription ->> 'title'),
      nullif(trim(prescription ->> 'description'), '')
    ) returning id into prescription_id;

    perform public.insert_weekly_planner_components(
      prescription_id,
      prescription -> 'components'
    );
    imported_count := imported_count + 1;
  end loop;

  return imported_count;
end;
$$;

revoke all on function public.import_draft_training_week(uuid, jsonb) from public, anon;
grant execute on function public.import_draft_training_week(uuid, jsonb) to authenticated;

commit;
