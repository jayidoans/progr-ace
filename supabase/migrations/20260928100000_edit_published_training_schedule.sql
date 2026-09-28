begin;

create function public.can_revise_published_training_week(p_week_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.training_weeks week
    join public.training_programs program on program.id = week.training_program_id
    where week.id = p_week_id
      and week.planning_status = 'PUBLISHED'
      and week.end_date >= current_date
      and program.status = 'PUBLISHED'
      and (
        public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = auth.uid())
      )
  );
$$;

create function public.create_published_week_prescription(
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
  week_record public.training_weeks;
  prescription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select * into week_record
  from public.training_weeks
  where id = p_week_id
  for update;

  if week_record.id is null or not public.can_revise_published_training_week(p_week_id) then
    raise exception 'Published schedule revision is unavailable' using errcode = '42501';
  end if;
  if p_scheduled_date < current_date
    or p_scheduled_date < week_record.start_date
    or p_scheduled_date > week_record.end_date
  then
    raise exception 'Training session date must be today or later within the selected week'
      using errcode = '22023';
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

create function public.update_published_week_prescription(
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
  prescription_record public.training_prescriptions;
  week_record public.training_weeks;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select prescription.* into prescription_record
  from public.training_prescriptions prescription
  where prescription.id = p_prescription_id
  for update;

  if prescription_record.id is null then
    raise exception 'Training session is unavailable' using errcode = '42501';
  end if;

  select * into week_record
  from public.training_weeks
  where id = prescription_record.training_week_id
  for update;

  if not public.can_revise_published_training_week(week_record.id)
    or prescription_record.scheduled_date < current_date
    or p_scheduled_date < current_date
    or p_scheduled_date < week_record.start_date
    or p_scheduled_date > week_record.end_date
    or exists (
      select 1 from public.training_claims claim
      where claim.prescription_id = prescription_record.id
    )
  then
    raise exception 'Published training session revision is unavailable' using errcode = '42501';
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

revoke all on function public.can_revise_published_training_week(uuid) from public, anon, authenticated;
revoke all on function public.create_published_week_prescription(uuid, text, date, text, text, jsonb) from public, anon;
revoke all on function public.update_published_week_prescription(uuid, text, date, text, text, jsonb) from public, anon;

grant execute on function public.create_published_week_prescription(uuid, text, date, text, text, jsonb) to authenticated;
grant execute on function public.update_published_week_prescription(uuid, text, date, text, text, jsonb) to authenticated;

commit;
