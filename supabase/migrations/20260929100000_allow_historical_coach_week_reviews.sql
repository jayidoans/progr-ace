begin;

create or replace function public.save_training_activity_comment(
  p_claim_activity_id uuid,
  p_coach_comment text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  normalized_comment text := nullif(trim(p_coach_comment), '');
  week_record record;
  comment_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if normalized_comment is null or length(normalized_comment) > 4000 then
    raise exception 'A comment between 1 and 4000 characters is required' using errcode = '22023';
  end if;

  select week.id, week.planning_status, week.start_date,
         program.status as program_status
    into week_record
  from public.claim_activities evidence
  join public.training_claims claim on claim.id = evidence.claim_id
  join public.training_prescriptions prescription on prescription.id = claim.prescription_id
  join public.training_weeks week on week.id = prescription.training_week_id
  join public.training_programs program on program.id = week.training_program_id
  where evidence.id = p_claim_activity_id
    and claim.status = 'SUBMITTED';

  if week_record.id is null
    or week_record.planning_status <> 'PUBLISHED'
    or week_record.program_status <> 'PUBLISHED'
    or current_date < week_record.start_date
    or not public.can_review_training_week(week_record.id)
  then
    raise exception 'Activity review is available only for current or past published weeks' using errcode = '42501';
  end if;

  insert into public.training_activity_comments (
    claim_activity_id, coach_comment, reviewed_by
  ) values (
    p_claim_activity_id, normalized_comment, actor_id
  )
  on conflict (claim_activity_id) do update
    set coach_comment = excluded.coach_comment,
        reviewed_by = excluded.reviewed_by,
        updated_at = now()
  returning id into comment_id;

  return comment_id;
end;
$$;

create or replace function public.save_training_week_review(
  p_training_week_id uuid,
  p_fulfillment_rating integer,
  p_coach_comment text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  normalized_comment text := nullif(trim(p_coach_comment), '');
  week_record record;
  review_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_fulfillment_rating is null or p_fulfillment_rating < 0 or p_fulfillment_rating > 10 then
    raise exception 'Fulfillment rating must be between 0 and 10' using errcode = '22023';
  end if;
  if normalized_comment is not null and length(normalized_comment) > 4000 then
    raise exception 'Week comment must not exceed 4000 characters' using errcode = '22023';
  end if;

  select week.id, week.planning_status, week.start_date,
         program.status as program_status
    into week_record
  from public.training_weeks week
  join public.training_programs program on program.id = week.training_program_id
  where week.id = p_training_week_id;

  if week_record.id is null
    or week_record.planning_status <> 'PUBLISHED'
    or week_record.program_status <> 'PUBLISHED'
    or current_date < week_record.start_date
    or not public.can_review_training_week(week_record.id)
  then
    raise exception 'Week review is available only for current or past published weeks' using errcode = '42501';
  end if;

  insert into public.training_week_reviews (
    training_week_id, fulfillment_rating, coach_comment, reviewed_by
  ) values (
    p_training_week_id, p_fulfillment_rating, normalized_comment, actor_id
  )
  on conflict (training_week_id) do update
    set fulfillment_rating = excluded.fulfillment_rating,
        coach_comment = excluded.coach_comment,
        reviewed_by = excluded.reviewed_by,
        updated_at = now()
  returning id into review_id;

  return review_id;
end;
$$;

commit;
