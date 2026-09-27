begin;

create table public.training_week_reviews (
  id uuid primary key default gen_random_uuid(),
  training_week_id uuid not null unique references public.training_weeks(id) on delete cascade,
  fulfillment_rating smallint not null check (fulfillment_rating between 0 and 10),
  coach_comment text check (coach_comment is null or length(trim(coach_comment)) between 1 and 4000),
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_activity_comments (
  id uuid primary key default gen_random_uuid(),
  claim_activity_id uuid not null unique references public.claim_activities(id) on delete cascade,
  coach_comment text not null check (length(trim(coach_comment)) between 1 and 4000),
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger training_week_reviews_set_updated_at
before update on public.training_week_reviews
for each row execute function public.set_updated_at();

create trigger training_activity_comments_set_updated_at
before update on public.training_activity_comments
for each row execute function public.set_updated_at();

create function public.can_review_training_week(p_training_week_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1
    from public.training_weeks week
    join public.training_programs program on program.id = week.training_program_id
    where week.id = p_training_week_id
      and (
        public.has_role('ADMIN')
        or (public.has_role('COACH') and program.created_by = auth.uid())
      )
  );
$$;

create function public.can_read_training_week_review(p_training_week_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1
    from public.training_weeks week
    join public.training_programs program on program.id = week.training_program_id
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    where week.id = p_training_week_id
      and (
        public.can_review_training_week(week.id)
        or (public.has_role('ATHLETE') and goal.athlete_id = auth.uid())
      )
  );
$$;

create function public.save_training_activity_comment(
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

  select week.id, week.planning_status, week.start_date, week.end_date,
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
    or current_date > week_record.end_date
    or not public.can_review_training_week(week_record.id)
  then
    raise exception 'Current-week Activity review is unavailable' using errcode = '42501';
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

create function public.save_training_week_review(
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

  select week.id, week.planning_status, week.start_date, week.end_date,
         program.status as program_status
    into week_record
  from public.training_weeks week
  join public.training_programs program on program.id = week.training_program_id
  where week.id = p_training_week_id;

  if week_record.id is null
    or week_record.planning_status <> 'PUBLISHED'
    or week_record.program_status <> 'PUBLISHED'
    or current_date < week_record.start_date
    or current_date > week_record.end_date
    or not public.can_review_training_week(week_record.id)
  then
    raise exception 'Current-week review is unavailable' using errcode = '42501';
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

alter table public.training_week_reviews enable row level security;
alter table public.training_week_reviews force row level security;
alter table public.training_activity_comments enable row level security;
alter table public.training_activity_comments force row level security;

create policy "training_week_reviews_select_authorized"
on public.training_week_reviews for select to authenticated
using (public.can_read_training_week_review(training_week_id));

create policy "training_activity_comments_select_authorized"
on public.training_activity_comments for select to authenticated
using (
  exists (
    select 1
    from public.claim_activities evidence
    join public.training_claims claim on claim.id = evidence.claim_id
    join public.training_prescriptions prescription on prescription.id = claim.prescription_id
    where evidence.id = training_activity_comments.claim_activity_id
      and public.can_read_training_week_review(prescription.training_week_id)
  )
);

revoke all on table public.training_week_reviews from public, anon, authenticated;
revoke all on table public.training_activity_comments from public, anon, authenticated;
grant select on table public.training_week_reviews to authenticated;
grant select on table public.training_activity_comments to authenticated;

revoke all on function public.can_review_training_week(uuid) from public, anon;
revoke all on function public.can_read_training_week_review(uuid) from public, anon;
revoke all on function public.save_training_activity_comment(uuid, text) from public, anon;
revoke all on function public.save_training_week_review(uuid, integer, text) from public, anon;
grant execute on function public.can_review_training_week(uuid) to authenticated;
grant execute on function public.can_read_training_week_review(uuid) to authenticated;
grant execute on function public.save_training_activity_comment(uuid, text) to authenticated;
grant execute on function public.save_training_week_review(uuid, integer, text) to authenticated;

commit;
