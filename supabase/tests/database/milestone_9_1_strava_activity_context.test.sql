begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.throws_any_ok(p_sql text, p_description text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when others then
  return extensions.ok(true, p_description);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('91000000-0000-4000-8000-000000000001', 'm91-athlete-a@example.test', '{"full_name":"M9.1 Athlete A"}'),
  ('91000000-0000-4000-8000-000000000002', 'm91-athlete-b@example.test', '{"full_name":"M9.1 Athlete B"}');

insert into public.races (id, name, event_date, distance_m)
values ('92000000-0000-4000-8000-000000000001', 'M9.1 Test Race', '2027-03-07', 10000);

insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values (
  '93000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  3600,
  'ACTIVE'
);

insert into public.training_programs (
  id, race_goal_id, name, start_date, end_date, status, created_by
) values (
  '94000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  'M9.1 Published Program', '2027-02-01', '2027-02-07', 'PUBLISHED',
  '91000000-0000-4000-8000-000000000001'
);

insert into public.training_weeks (
  id, training_program_id, week_number, phase, start_date, end_date
) values (
  '95000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001',
  1, 'M9.1', '2027-02-01', '2027-02-07'
);

insert into public.training_prescriptions (
  id, training_week_id, training_menu, scheduled_date, title
) values
  ('96000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'EASY', '2027-02-02', 'Draft context'),
  ('96000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000001', 'EASY', '2027-02-04', 'Submitted context');

insert into public.prescription_components (
  prescription_id, sequence_order, component_type, target_distance_m
) values
  ('96000000-0000-4000-8000-000000000001', 1, 'EASY', 5000),
  ('96000000-0000-4000-8000-000000000002', 1, 'EASY', 5000);

insert into public.activities (
  id, athlete_id, name, sport_type, started_at, distance_m, duration_sec,
  rpe, notes, source, external_activity_id, raw_data
) values
  ('97000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Unlocked Strava', 'RUNNING', '2027-02-01T06:00:00Z', 5000, 1800, null, 'Initial note', 'STRAVA', 'm91-unlocked', '{"sport_type":"Run"}'),
  ('97000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', 'Draft Strava', 'RUNNING', '2027-02-02T06:00:00Z', 5000, 1800, null, null, 'STRAVA', 'm91-draft', '{"sport_type":"Run"}'),
  ('97000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000001', 'Submitted Strava', 'RUNNING', '2027-02-04T06:00:00Z', 5000, 1800, 6, 'Submitted note', 'STRAVA', 'm91-submitted', '{"sport_type":"Run"}'),
  ('97000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000002', 'Other Athlete Strava', 'RUNNING', '2027-02-01T07:00:00Z', 5000, 1800, null, null, 'STRAVA', 'm91-other', '{"sport_type":"Run"}'),
  ('97000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000001', 'Manual remains editable', 'RUNNING', '2027-02-03T06:00:00Z', 5000, 1800, 4, null, 'MANUAL', null, null);

insert into public.training_claims (id, athlete_id, prescription_id)
values
  ('98000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001'),
  ('98000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000002');

insert into public.claim_activities (claim_id, activity_id)
values
  ('98000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000002'),
  ('98000000-0000-4000-8000-000000000002', '97000000-0000-4000-8000-000000000003');

update public.training_claims
set status = 'SUBMITTED', submitted_at = now()
where id = '98000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000001', 7, 'Initial note'
  ) $$,
  'owner can update RPE on unlocked Strava evidence'
);
select is(
  (select rpe from public.activities where id = '97000000-0000-4000-8000-000000000001'),
  7::smallint,
  'updated Strava RPE persists'
);

select lives_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000001', 7, 'Updated athlete note'
  ) $$,
  'owner can update Notes on unlocked Strava evidence'
);
select is(
  (select notes from public.activities where id = '97000000-0000-4000-8000-000000000001'),
  'Updated athlete note',
  'updated Strava Notes persist'
);

select lives_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000001', 8, 'RPE and Notes together'
  ) $$,
  'owner can update RPE and Notes together'
);

update public.activities
set name = 'Forged provider name', distance_m = 1
where id = '97000000-0000-4000-8000-000000000001';
select is(
  (select name from public.activities where id = '97000000-0000-4000-8000-000000000001'),
  'Unlocked Strava',
  'direct browser update cannot modify Strava provider fields'
);
select is(
  (select distance_m from public.activities where id = '97000000-0000-4000-8000-000000000001'),
  5000,
  'direct browser update leaves Strava metrics unchanged'
);

select lives_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000002', 5, 'Draft evidence remains editable'
  ) $$,
  'Strava evidence used only by a draft Claim remains editable'
);
select pg_temp.throws_any_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000003', 9, 'Must remain locked'
  ) $$,
  'submitted-Claim Strava evidence cannot change RPE or Notes'
);
select is(
  (select notes from public.activities where id = '97000000-0000-4000-8000-000000000003'),
  'Submitted note',
  'submitted Strava context remains unchanged'
);

select lives_ok(
  $$ update public.activities
    set rpe = 5, notes = 'Manual behavior unchanged'
    where id = '97000000-0000-4000-8000-000000000005' $$,
  'manual Activity editing remains available'
);
select is(
  (select notes from public.activities where id = '97000000-0000-4000-8000-000000000005'),
  'Manual behavior unchanged',
  'manual Activity update persists'
);

select pg_temp.throws_any_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000001', 11, null
  ) $$,
  'RPE outside 1 to 10 remains rejected'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select pg_temp.throws_any_ok(
  $$ select public.update_strava_activity_context(
    '97000000-0000-4000-8000-000000000001', 3, 'Cross-athlete attempt'
  ) $$,
  'another athlete cannot update Strava RPE or Notes'
);
reset role;

select ok(
  (select prosecdef and coalesce(array_to_string(proconfig, ','), '') = 'search_path=""'
   from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where nspname = 'public' and proname = 'update_strava_activity_context'),
  'context RPC is SECURITY DEFINER with an empty search path'
);
select ok(
  has_function_privilege('authenticated', 'public.update_strava_activity_context(uuid,integer,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.update_strava_activity_context(uuid,integer,text)', 'EXECUTE'),
  'only authenticated clients may execute the context RPC'
);
select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'public' and relname = 'activities'),
  'Activity RLS remains enabled and forced'
);
select is(
  (select status from public.training_claims where id = '98000000-0000-4000-8000-000000000002'),
  'SUBMITTED',
  'Claim lifecycle remains unchanged'
);
select is(
  (select count(*) from public.claim_validations where claim_id = '98000000-0000-4000-8000-000000000002'),
  1::bigint,
  'existing Validation creation remains unchanged'
);

select * from finish();
rollback;
