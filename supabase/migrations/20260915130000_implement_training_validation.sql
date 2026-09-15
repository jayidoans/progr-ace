begin;

create table public.claim_validations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique
    references public.training_claims(id) on delete restrict,
  automatic_result text not null,
  result text not null,
  evaluation_source text not null default 'AUTOMATIC',
  reviewer_id uuid references public.profiles(id) on delete restrict,
  reviewer_note text,
  evaluated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claim_validations_automatic_result_check
    check (automatic_result in ('VERIFIED', 'PARTIAL', 'NEEDS_REVIEW')),
  constraint claim_validations_result_check
    check (result in ('VERIFIED', 'PARTIAL', 'NEEDS_REVIEW', 'REJECTED')),
  constraint claim_validations_evaluation_source_check
    check (evaluation_source in ('AUTOMATIC', 'COACH')),
  constraint claim_validations_reviewer_note_length_check
    check (reviewer_note is null or char_length(reviewer_note) <= 4000),
  constraint claim_validations_source_lifecycle_check check (
    (
      evaluation_source = 'AUTOMATIC'
      and result = automatic_result
      and reviewer_id is null
      and reviewer_note is null
      and reviewed_at is null
    )
    or
    (
      evaluation_source = 'COACH'
      and result in ('VERIFIED', 'PARTIAL', 'REJECTED')
      and reviewer_id is not null
      and reviewed_at is not null
      and (
        result = 'VERIFIED'
        or nullif(trim(reviewer_note), '') is not null
      )
    )
  )
);

create table public.validation_checks (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null
    references public.claim_validations(id) on delete restrict,
  sequence_order integer not null,
  check_type text not null,
  target_value numeric,
  actual_value numeric,
  unit text,
  target_text text,
  actual_text text,
  result text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint validation_checks_sequence_positive_check check (sequence_order > 0),
  constraint validation_checks_type_check check (check_type in (
    'SPORT_COMPATIBILITY',
    'DISTANCE',
    'DURATION',
    'PACE',
    'TOTAL_DISTANCE',
    'INTERVAL_STRUCTURE',
    'TEMPO_SEGMENT',
    'COMPONENT_STRUCTURE'
  )),
  constraint validation_checks_unit_check check (
    unit is null or unit in ('METER', 'SECOND', 'SECOND_PER_KM')
  ),
  constraint validation_checks_result_check check (
    result in ('PASS', 'FAIL', 'PARTIAL', 'NOT_EVALUABLE', 'INFO')
  ),
  constraint validation_checks_message_not_blank_check check (length(trim(message)) > 0),
  constraint validation_checks_validation_sequence_key unique (validation_id, sequence_order)
);

create index claim_validations_result_evaluated_idx
  on public.claim_validations (result, evaluated_at desc);
create index claim_validations_reviewer_idx
  on public.claim_validations (reviewer_id, reviewed_at desc)
  where reviewer_id is not null;
create index validation_checks_validation_order_idx
  on public.validation_checks (validation_id, sequence_order);

create trigger claim_validations_set_updated_at
before update on public.claim_validations
for each row execute function public.set_updated_at();

create or replace function public.can_review_training_claim(p_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.training_claims claim
    join public.training_prescriptions prescription on prescription.id = claim.prescription_id
    join public.training_weeks week on week.id = prescription.training_week_id
    join public.training_programs program on program.id = week.training_program_id
    where claim.id = p_claim_id
      and claim.status = 'SUBMITTED'
      and (
        exists (
          select 1
          from public.user_roles
          join public.roles on roles.id = user_roles.role_id
          where user_roles.user_id = auth.uid() and roles.name = 'ADMIN'
        )
        or (
          program.created_by = auth.uid()
          and exists (
            select 1
            from public.user_roles
            join public.roles on roles.id = user_roles.role_id
            where user_roles.user_id = auth.uid() and roles.name = 'COACH'
          )
        )
      )
  );
$$;

create or replace function public.can_read_training_claim(p_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.training_claims
    where id = p_claim_id
      and (
        athlete_id = auth.uid()
        or public.can_review_training_claim(id)
      )
  );
$$;

create or replace function public.can_review_activity_evidence(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.claim_activities
    where activity_id = p_activity_id
      and public.can_review_training_claim(claim_id)
  );
$$;

create or replace function public.evaluate_training_claim_internal(p_claim_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claim_status text;
  training_menu text;
  validation_id uuid;
  expected_sport text;
  actual_sports text;
  evidence_count integer;
  all_sport_compatible boolean;
  actual_distance_m bigint;
  actual_duration_sec bigint;
  component_count integer;
  measurable_distance_count integer;
  target_total_distance_m bigint;
  component public.prescription_components;
  check_order integer := 0;
  has_not_evaluable boolean := false;
  has_incomplete_measure boolean := false;
  actual_pace_sec_per_km numeric;
  final_automatic_result text;
begin
  select claim.status, prescription.training_menu
  into claim_status, training_menu
  from public.training_claims claim
  join public.training_prescriptions prescription on prescription.id = claim.prescription_id
  where claim.id = p_claim_id
  for update of claim;

  if claim_status is null then
    raise exception 'Submitted claim was not found' using errcode = 'P0002';
  end if;
  if claim_status <> 'SUBMITTED' then
    raise exception 'Only submitted claims can be evaluated' using errcode = '23514';
  end if;

  select id into validation_id
  from public.claim_validations
  where claim_id = p_claim_id
  for update;
  if validation_id is not null then
    return validation_id;
  end if;

  expected_sport := case
    when training_menu = 'STRENGTH' then 'STRENGTH_TRAINING'
    else 'RUNNING'
  end;

  select
    count(*)::integer,
    string_agg(distinct activity.sport_type, ', ' order by activity.sport_type),
    coalesce(bool_and(activity.sport_type = expected_sport), false),
    sum(activity.distance_m) filter (where activity.sport_type = expected_sport),
    sum(activity.duration_sec) filter (where activity.sport_type = expected_sport)
  into evidence_count, actual_sports, all_sport_compatible, actual_distance_m, actual_duration_sec
  from public.claim_activities evidence
  join public.activities activity on activity.id = evidence.activity_id
  where evidence.claim_id = p_claim_id;

  if evidence_count = 0 then
    raise exception 'A validation requires Activity evidence' using errcode = '23514';
  end if;

  insert into public.claim_validations (
    claim_id, automatic_result, result, evaluation_source
  )
  values (p_claim_id, 'NEEDS_REVIEW', 'NEEDS_REVIEW', 'AUTOMATIC')
  returning id into validation_id;

  check_order := check_order + 1;
  if all_sport_compatible then
    insert into public.validation_checks (
      validation_id, sequence_order, check_type, target_text, actual_text, result, message
    ) values (
      validation_id, check_order, 'SPORT_COMPATIBILITY', expected_sport, actual_sports,
      'PASS', 'All selected evidence uses the expected activity category.'
    );
  else
    has_not_evaluable := true;
    insert into public.validation_checks (
      validation_id, sequence_order, check_type, target_text, actual_text, result, message
    ) values (
      validation_id, check_order, 'SPORT_COMPATIBILITY', expected_sport,
      coalesce(actual_sports, 'Unavailable'), 'NOT_EVALUABLE',
      'The submitted sport cannot automatically demonstrate the prescribed training category.'
    );
  end if;

  select
    count(*)::integer,
    count(target_distance_m)::integer,
    sum(target_distance_m)
  into component_count, measurable_distance_count, target_total_distance_m
  from public.prescription_components
  where prescription_id = (
    select prescription_id from public.training_claims where id = p_claim_id
  );

  if component_count > 1 then
    if measurable_distance_count = component_count then
      check_order := check_order + 1;
      if actual_distance_m is null then
        has_not_evaluable := true;
        insert into public.validation_checks (
          validation_id, sequence_order, check_type, target_value, unit, result, message
        ) values (
          validation_id, check_order, 'TOTAL_DISTANCE', target_total_distance_m, 'METER',
          'NOT_EVALUABLE', 'Comparable running distance is unavailable.'
        );
      elsif actual_distance_m >= target_total_distance_m then
        insert into public.validation_checks (
          validation_id, sequence_order, check_type, target_value, actual_value, unit, result, message
        ) values (
          validation_id, check_order, 'TOTAL_DISTANCE', target_total_distance_m,
          actual_distance_m, 'METER', 'PASS',
          'Aggregate distance meets the sum of component distance targets.'
        );
      else
        has_incomplete_measure := true;
        insert into public.validation_checks (
          validation_id, sequence_order, check_type, target_value, actual_value, unit, result, message
        ) values (
          validation_id, check_order, 'TOTAL_DISTANCE', target_total_distance_m,
          actual_distance_m, 'METER', 'PARTIAL',
          'Aggregate distance is below the sum of component distance targets.'
        );
      end if;
    end if;

    check_order := check_order + 1;
    has_not_evaluable := true;
    insert into public.validation_checks (
      validation_id, sequence_order, check_type, target_text, actual_text, result, message
    ) values (
      validation_id, check_order, 'COMPONENT_STRUCTURE',
      component_count::text || ' ordered components', 'Segment data unavailable',
      'NOT_EVALUABLE',
      'Activity-level totals cannot verify the prescribed component order or segment execution.'
    );
  elsif component_count = 1 then
    select * into component
    from public.prescription_components
    where prescription_id = (
      select prescription_id from public.training_claims where id = p_claim_id
    );

    if component.component_type = 'INTERVAL'
      or component.repetitions is not null
      or component.distance_per_rep_m is not null
      or component.recovery_duration_sec is not null
    then
      check_order := check_order + 1;
      has_not_evaluable := true;
      insert into public.validation_checks (
        validation_id, sequence_order, check_type, target_text, actual_text, result, message
      ) values (
        validation_id, check_order, 'INTERVAL_STRUCTURE',
        concat_ws(' ', component.repetitions::text, '×', component.distance_per_rep_m::text, 'm'),
        'Lap and recovery data unavailable', 'NOT_EVALUABLE',
        'Interval repetitions, split distances, and recoveries cannot be verified from activity totals.'
      );
    elsif component.component_type = 'TEMPO' then
      check_order := check_order + 1;
      has_not_evaluable := true;
      insert into public.validation_checks (
        validation_id, sequence_order, check_type, target_value, unit,
        target_text, actual_text, result, message
      ) values (
        validation_id, check_order, 'TEMPO_SEGMENT', component.target_duration_sec, 'SECOND',
        'Tempo segment', 'Segment data unavailable', 'NOT_EVALUABLE',
        'Whole-activity duration cannot prove the prescribed Tempo segment.'
      );
    else
      if component.target_distance_m is not null then
        check_order := check_order + 1;
        if actual_distance_m is null then
          has_not_evaluable := true;
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, target_value, unit, result, message
          ) values (
            validation_id, check_order, 'DISTANCE', component.target_distance_m, 'METER',
            'NOT_EVALUABLE', 'Comparable distance evidence is unavailable.'
          );
        elsif actual_distance_m >= component.target_distance_m then
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, target_value, actual_value, unit, result, message
          ) values (
            validation_id, check_order, 'DISTANCE', component.target_distance_m,
            actual_distance_m, 'METER', 'PASS',
            'Aggregate distance meets the minimum target.'
          );
        else
          has_incomplete_measure := true;
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, target_value, actual_value, unit, result, message
          ) values (
            validation_id, check_order, 'DISTANCE', component.target_distance_m,
            actual_distance_m, 'METER', 'PARTIAL',
            'Aggregate distance is below the minimum target.'
          );
        end if;
      end if;

      if component.target_duration_sec is not null then
        check_order := check_order + 1;
        if actual_duration_sec is null then
          has_not_evaluable := true;
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, target_value, unit, result, message
          ) values (
            validation_id, check_order, 'DURATION', component.target_duration_sec, 'SECOND',
            'NOT_EVALUABLE', 'Comparable duration evidence is unavailable.'
          );
        elsif actual_duration_sec >= component.target_duration_sec then
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, target_value, actual_value, unit, result, message
          ) values (
            validation_id, check_order, 'DURATION', component.target_duration_sec,
            actual_duration_sec, 'SECOND', 'PASS',
            'Aggregate duration meets the minimum target.'
          );
        else
          has_incomplete_measure := true;
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, target_value, actual_value, unit, result, message
          ) values (
            validation_id, check_order, 'DURATION', component.target_duration_sec,
            actual_duration_sec, 'SECOND', 'PARTIAL',
            'Aggregate duration is below the minimum target.'
          );
        end if;
      end if;

      if component.target_pace_min_sec_per_km is not null
        or component.target_pace_max_sec_per_km is not null
      then
        check_order := check_order + 1;
        if actual_distance_m is null or actual_distance_m <= 0
          or actual_duration_sec is null or actual_duration_sec <= 0
        then
          has_not_evaluable := true;
          insert into public.validation_checks (
            validation_id, sequence_order, check_type, unit, target_text, result, message
          ) values (
            validation_id, check_order, 'PACE', 'SECOND_PER_KM',
            concat_ws('–', component.target_pace_min_sec_per_km, component.target_pace_max_sec_per_km),
            'NOT_EVALUABLE', 'Distance and duration are required to derive comparable pace.'
          );
        else
          actual_pace_sec_per_km := round((actual_duration_sec * 1000.0) / actual_distance_m);
          if (component.target_pace_min_sec_per_km is null
              or actual_pace_sec_per_km >= component.target_pace_min_sec_per_km)
            and (component.target_pace_max_sec_per_km is null
              or actual_pace_sec_per_km <= component.target_pace_max_sec_per_km)
          then
            insert into public.validation_checks (
              validation_id, sequence_order, check_type, actual_value, unit,
              target_text, result, message
            ) values (
              validation_id, check_order, 'PACE', actual_pace_sec_per_km, 'SECOND_PER_KM',
              concat_ws('–', component.target_pace_min_sec_per_km, component.target_pace_max_sec_per_km),
              'PASS', 'Derived whole-activity pace is within the explicit target range.'
            );
          else
            has_incomplete_measure := true;
            insert into public.validation_checks (
              validation_id, sequence_order, check_type, actual_value, unit,
              target_text, result, message
            ) values (
              validation_id, check_order, 'PACE', actual_pace_sec_per_km, 'SECOND_PER_KM',
              concat_ws('–', component.target_pace_min_sec_per_km, component.target_pace_max_sec_per_km),
              'FAIL', 'Derived whole-activity pace is outside the explicit target range.'
            );
          end if;
        end if;
      end if;
    end if;
  end if;

  final_automatic_result := case
    when has_not_evaluable then 'NEEDS_REVIEW'
    when has_incomplete_measure then 'PARTIAL'
    else 'VERIFIED'
  end;

  update public.claim_validations
  set automatic_result = final_automatic_result,
      result = final_automatic_result
  where id = validation_id;

  return validation_id;
end;
$$;

create or replace function public.create_automatic_claim_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.evaluate_training_claim_internal(new.id);
  return new;
end;
$$;

create trigger training_claims_create_automatic_validation
after update of status on public.training_claims
for each row
when (old.status = 'DRAFT' and new.status = 'SUBMITTED')
execute function public.create_automatic_claim_validation();

create or replace function public.review_training_claim(
  p_claim_id uuid,
  p_result text,
  p_reviewer_note text default null
)
returns public.claim_validations
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_validation public.claim_validations;
  reviewed_validation public.claim_validations;
  normalized_note text := nullif(trim(p_reviewer_note), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_result not in ('VERIFIED', 'PARTIAL', 'REJECTED') then
    raise exception 'Coach result is invalid' using errcode = '22023';
  end if;
  if char_length(coalesce(normalized_note, '')) > 4000 then
    raise exception 'Reviewer note is too long' using errcode = '22023';
  end if;
  if p_result in ('PARTIAL', 'REJECTED') and normalized_note is null then
    raise exception 'A reviewer note is required for this decision' using errcode = '22023';
  end if;

  select validation.* into current_validation
  from public.claim_validations validation
  join public.training_claims claim on claim.id = validation.claim_id
  where validation.claim_id = p_claim_id and claim.status = 'SUBMITTED'
  for update of validation;

  if current_validation.id is null or not public.can_review_training_claim(p_claim_id) then
    raise exception 'Claim review is unavailable' using errcode = '42501';
  end if;
  if current_validation.automatic_result <> 'NEEDS_REVIEW' then
    raise exception 'Only an automatically unresolved claim requires Coach review'
      using errcode = '23514';
  end if;

  if current_validation.evaluation_source = 'COACH'
    and current_validation.result = p_result
    and current_validation.reviewer_id = auth.uid()
    and current_validation.reviewer_note is not distinct from normalized_note
  then
    return current_validation;
  end if;

  update public.claim_validations
  set result = p_result,
      evaluation_source = 'COACH',
      reviewer_id = auth.uid(),
      reviewer_note = normalized_note,
      reviewed_at = now()
  where id = current_validation.id
  returning * into reviewed_validation;

  return reviewed_validation;
end;
$$;

create or replace function public.protect_submitted_prescription_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.training_claims
    where prescription_id = old.id and status = 'SUBMITTED'
  ) and (
    tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.training_week_id is distinct from old.training_week_id
    or new.training_menu is distinct from old.training_menu
    or new.scheduled_date is distinct from old.scheduled_date
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'A Prescription with submitted evidence is immutable'
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.protect_submitted_prescription_component()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_prescription_id uuid;
begin
  target_prescription_id := case when tg_op = 'INSERT' then new.prescription_id else old.prescription_id end;
  if exists (
    select 1 from public.training_claims
    where prescription_id = target_prescription_id and status = 'SUBMITTED'
  ) then
    raise exception 'Components for a Prescription with submitted evidence are immutable'
      using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.prescription_id is distinct from old.prescription_id and exists (
    select 1 from public.training_claims
    where prescription_id = new.prescription_id and status = 'SUBMITTED'
  ) then
    raise exception 'Components cannot move to a Prescription with submitted evidence'
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger training_prescriptions_protect_submitted_target
before update or delete on public.training_prescriptions
for each row execute function public.protect_submitted_prescription_target();

create trigger prescription_components_protect_submitted_target
before insert or update or delete on public.prescription_components
for each row execute function public.protect_submitted_prescription_component();

alter table public.claim_validations enable row level security;
alter table public.claim_validations force row level security;
alter table public.validation_checks enable row level security;
alter table public.validation_checks force row level security;

create policy "training_claims_select_program_reviewer" on public.training_claims
for select to authenticated using (public.can_review_training_claim(id));

create policy "claim_activities_select_program_reviewer" on public.claim_activities
for select to authenticated using (public.can_review_training_claim(claim_id));

create policy "activities_select_program_reviewer" on public.activities
for select to authenticated using (public.can_review_activity_evidence(id));

create policy "claim_validations_select_authorized" on public.claim_validations
for select to authenticated using (public.can_read_training_claim(claim_id));

create policy "validation_checks_select_authorized" on public.validation_checks
for select to authenticated using (
  exists (
    select 1 from public.claim_validations validation
    where validation.id = validation_checks.validation_id
      and public.can_read_training_claim(validation.claim_id)
  )
);

revoke all on table public.claim_validations from public, anon, authenticated;
revoke all on table public.validation_checks from public, anon, authenticated;
grant select on table public.claim_validations to authenticated;
grant select on table public.validation_checks to authenticated;

revoke execute on function public.can_review_training_claim(uuid) from public, anon;
grant execute on function public.can_review_training_claim(uuid) to authenticated;
revoke execute on function public.can_read_training_claim(uuid) from public, anon;
grant execute on function public.can_read_training_claim(uuid) to authenticated;
revoke execute on function public.can_review_activity_evidence(uuid) from public, anon;
grant execute on function public.can_review_activity_evidence(uuid) to authenticated;
revoke execute on function public.evaluate_training_claim_internal(uuid) from public, anon, authenticated;
revoke execute on function public.create_automatic_claim_validation() from public, anon, authenticated;
revoke execute on function public.protect_submitted_prescription_target() from public, anon, authenticated;
revoke execute on function public.protect_submitted_prescription_component() from public, anon, authenticated;
revoke execute on function public.review_training_claim(uuid, text, text) from public, anon;
grant execute on function public.review_training_claim(uuid, text, text) to authenticated;

select public.evaluate_training_claim_internal(id)
from public.training_claims
where status = 'SUBMITTED';

commit;
