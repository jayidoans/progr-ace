begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.throws_any_ok(p_sql text, p_description text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when others then
  return extensions.ok(true, p_description);
end;
$$;

-- A second Coach-owned program proves that COACH is scoped by program.created_by.
insert into public.athlete_race_goals (
  id, athlete_id, race_id, target_finish_time_sec, status
)
values (
  '81000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000004',
  '62000000-0000-4000-8000-000000000001',
  7500,
  'ACTIVE'
);

insert into public.training_programs (
  id, race_goal_id, name, start_date, end_date, status, created_by
)
values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Coach B Program',
  '2027-01-04',
  '2027-01-10',
  'PUBLISHED',
  '61000000-0000-4000-8000-000000000005'
);

insert into public.training_weeks (
  id, training_program_id, week_number, phase, start_date, end_date
)
values (
  '83000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  1,
  'Build',
  '2027-01-04',
  '2027-01-10'
);

insert into public.training_prescriptions (
  id, training_week_id, training_menu, scheduled_date, title
)
values
  ('84000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 'SPEED', '2027-01-06', 'Coach B Intervals'),
  ('84000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000001', 'EASY', '2027-01-08', 'Coach B Pace Run');

insert into public.prescription_components (
  id, prescription_id, sequence_order, component_type, target_distance_m,
  repetitions, distance_per_rep_m, recovery_duration_sec,
  target_pace_min_sec_per_km, target_pace_max_sec_per_km
)
values
  ('85000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 1, 'INTERVAL', null, 8, 400, 90, null, null),
  ('85000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000002', 1, 'EASY', 5000, null, null, null, 360, 370);

insert into public.activities (
  id, athlete_id, name, sport_type, started_at, distance_m, duration_sec, source
)
values
  ('86000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000004', 'Coach B Interval Evidence', 'RUNNING', '2027-01-06T06:00:00Z', 6000, 2700, 'MANUAL'),
  ('86000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000004', 'Coach B Pace Evidence', 'RUNNING', '2027-01-08T06:00:00Z', 5000, 1825, 'MANUAL'),
  ('86000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', 'Draft-only Activity', 'RUNNING', '2027-01-06T06:00:00Z', 6000, 2400, 'MANUAL');

insert into public.training_claims (id, athlete_id, prescription_id)
values
  ('87000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000004', '84000000-0000-4000-8000-000000000001'),
  ('87000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000004', '84000000-0000-4000-8000-000000000002'),
  ('87000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', '66000000-0000-4000-8000-000000000008');

insert into public.claim_activities (claim_id, activity_id)
values
  ('87000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000001'),
  ('87000000-0000-4000-8000-000000000002', '86000000-0000-4000-8000-000000000002'),
  ('87000000-0000-4000-8000-000000000003', '86000000-0000-4000-8000-000000000003');

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000004', true);
select public.submit_training_claim('87000000-0000-4000-8000-000000000001');
select public.submit_training_claim('87000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '', true);

select results_eq(
  $$ select name from public.roles order by name $$,
  $$ values ('ADMIN'::text), ('ATHLETE'::text), ('COACH'::text) $$,
  'M6 uses only the exact M1 role codes'
);

set local role anon;
select pg_temp.throws_any_ok(
  $$ select * from public.claim_validations $$,
  'anonymous cannot read validation records'
);
select pg_temp.throws_any_ok(
  $$ insert into public.claim_validations (claim_id, automatic_result, result) values ('69000000-0000-4000-8000-000000000001', 'VERIFIED', 'VERIFIED') $$,
  'anonymous cannot create validation records'
);
select pg_temp.throws_any_ok(
  $$ select * from public.validation_checks $$,
  'anonymous cannot read validation checks'
);
select pg_temp.throws_any_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000002', 'VERIFIED', null) $$,
  'anonymous cannot execute Coach review'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.claim_validations), 7::bigint, 'Athlete A reads own validations');
select is(
  (select count(*) from public.claim_validations where claim_id = '87000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Athlete A cannot read Athlete B validation'
);
select ok((select count(*) from public.validation_checks) > 0, 'Athlete A reads own explainable checks');
select pg_temp.throws_any_ok(
  $$ update public.claim_validations set result = 'VERIFIED' where claim_id = '69000000-0000-4000-8000-000000000002' $$,
  'Athlete cannot directly set validation result'
);
select pg_temp.throws_any_ok(
  $$ insert into public.validation_checks (validation_id, sequence_order, check_type, result, message) values (gen_random_uuid(), 1, 'DISTANCE', 'PASS', 'spoof') $$,
  'Athlete cannot create validation checks'
);
select pg_temp.throws_any_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000002', 'VERIFIED', null) $$,
  'Athlete cannot impersonate a Coach through the review RPC'
);
select is(
  (select count(*) from public.claim_validations where claim_id = '87000000-0000-4000-8000-000000000003'),
  0::bigint,
  'DRAFT Claim receives no Validation'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000004', true);
select is((select count(*) from public.claim_validations), 2::bigint, 'Athlete B reads only own validations');
select is(
  (select count(*) from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Athlete B cannot inspect Athlete A validation'
);
reset role;

-- Automatic evaluation scenarios are asserted before any Coach decisions.
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000001'), 'VERIFIED', 'simple Easy Run is VERIFIED');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000001') and check_type = 'DISTANCE'), 'PASS', 'simple distance at or above the minimum target passes');
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000004'), 'PARTIAL', 'short Long Run is PARTIAL');
select is(
  round((select actual_value / target_value * 100 from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000004') and check_type = 'DISTANCE'), 1),
  52.8::numeric,
  'short distance records a descriptive 52.8 percent completion'
);
select is((select result from public.claim_validations where claim_id = '87000000-0000-4000-8000-000000000001'), 'NEEDS_REVIEW', 'interval without lap evidence needs review');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '87000000-0000-4000-8000-000000000001') and check_type = 'INTERVAL_STRUCTURE'), 'NOT_EVALUABLE', 'interval structure is not fabricated from total distance');
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000005'), 'NEEDS_REVIEW', 'Tempo without segment evidence needs review');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000005') and check_type = 'TEMPO_SEGMENT'), 'NOT_EVALUABLE', 'Tempo segment is explicitly not evaluable');
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000006'), 'NEEDS_REVIEW', 'composite workout without segments needs review');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000006') and check_type = 'TOTAL_DISTANCE'), 'PASS', 'composite total distance remains an explainable descriptive check');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000006') and check_type = 'COMPONENT_STRUCTURE'), 'NOT_EVALUABLE', 'matching total does not verify composite structure');
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000002'), 'NEEDS_REVIEW', 'alternative sport needs review rather than automatic rejection');
select is((select automatic_result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000002'), 'NEEDS_REVIEW', 'automatic engine never labels ambiguous substitution REJECTED');
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000007'), 'VERIFIED', 'structured Strength duration is VERIFIED');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000007') and check_type = 'DURATION'), 'PASS', 'Strength duration target passes');
select is((select result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000003'), 'VERIFIED', 'multi-Activity Long Run aggregates to VERIFIED');
select is((select actual_value from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000003') and check_type = 'DISTANCE'), 16000::numeric, 'multi-Activity distance aggregates to 16000 meters');
select is((select result from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '87000000-0000-4000-8000-000000000002') and check_type = 'PACE'), 'PASS', 'whole-activity pace inside an explicit simple range passes');
select is((select actual_value from public.validation_checks where validation_id = (select id from public.claim_validations where claim_id = '87000000-0000-4000-8000-000000000002') and check_type = 'PACE'), 365::numeric, 'pace is derived from canonical distance and duration');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.training_claims), 7::bigint, 'authorized Coach reads submitted Claims from own Programs');
select is((select count(*) from public.training_claims where status = 'DRAFT'), 0::bigint, 'Coach cannot read athlete draft Claims');
select is((select count(*) from public.claim_validations), 7::bigint, 'authorized Coach reads scoped validations');
select is((select count(*) from public.activities), 8::bigint, 'authorized Coach reads only Activity Evidence attached to scoped submitted Claims');
select pg_temp.throws_any_ok(
  $$ update public.claim_validations set result = 'VERIFIED' where claim_id = '69000000-0000-4000-8000-000000000002' $$,
  'Coach cannot bypass the review RPC with direct table mutation'
);
select lives_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000002', 'VERIFIED', 'Accepted substitution') $$,
  'authorized Coach resolves NEEDS_REVIEW to VERIFIED'
);
select lives_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000005', 'PARTIAL', 'Some useful Tempo work was completed') $$,
  'authorized Coach resolves NEEDS_REVIEW to PARTIAL with a note'
);
select lives_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000006', 'REJECTED', 'Component execution was not demonstrated') $$,
  'authorized Coach resolves NEEDS_REVIEW to REJECTED with a reason'
);
select pg_temp.throws_any_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000002', 'REJECTED', null) $$,
  'REJECTED requires a reviewer reason'
);
select is((select automatic_result from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000006'), 'NEEDS_REVIEW', 'Coach decision preserves the automatic result');
select is((select evaluation_source from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000006'), 'COACH', 'Coach decision records its evaluation source');
select is((select reviewer_id from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000006'), '61000000-0000-4000-8000-000000000002'::uuid, 'reviewer identity comes from auth.uid()');
select set_config('test.reviewed_at', (select reviewed_at::text from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000005'), true);
select public.review_training_claim('69000000-0000-4000-8000-000000000005', 'PARTIAL', 'Some useful Tempo work was completed');
select is((select reviewed_at::text from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000005'), current_setting('test.reviewed_at'), 'repeated identical Coach review is idempotent');
select pg_temp.throws_any_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000001', 'VERIFIED', null) $$,
  'automatically resolved Claim does not accept unnecessary Coach override'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000005', true);
select is((select count(*) from public.claim_validations), 2::bigint, 'unrelated Coach reads only own Program validations');
select is((select count(*) from public.claim_validations where claim_id::text like '69000000-%'), 0::bigint, 'unrelated Coach cannot inspect Coach A Claims');
select pg_temp.throws_any_ok(
  $$ select public.review_training_claim('69000000-0000-4000-8000-000000000002', 'VERIFIED', null) $$,
  'Coach cannot review another Coach Program'
);
select lives_ok(
  $$ select public.review_training_claim('87000000-0000-4000-8000-000000000001', 'VERIFIED', 'Intervals accepted after review') $$,
  'Coach can review a NEEDS_REVIEW Claim in own Program'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.claim_validations), 9::bigint, 'ADMIN reads all validation records explicitly through RLS');
select is((select count(*) from public.training_claims), 9::bigint, 'ADMIN reads all submitted Claims but not athlete drafts through review RLS');
reset role;

-- Re-evaluation and uniqueness are database-authoritative and idempotent.
select set_config('test.evaluated_at', (select evaluated_at::text from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000001'), true);
select public.evaluate_training_claim_internal('69000000-0000-4000-8000-000000000001');
select public.evaluate_training_claim_internal('69000000-0000-4000-8000-000000000001');
select is((select count(*) from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000001'), 1::bigint, 're-evaluation creates no duplicate validation row');
select is((select evaluated_at::text from public.claim_validations where claim_id = '69000000-0000-4000-8000-000000000001'), current_setting('test.evaluated_at'), 'idempotent re-evaluation preserves original evaluated_at');
select pg_temp.throws_any_ok(
  $$ insert into public.claim_validations (claim_id, automatic_result, result) values ('69000000-0000-4000-8000-000000000001', 'VERIFIED', 'VERIFIED') $$,
  'unique claim_id prevents duplicate validation rows'
);

-- Stable M5 inputs remain immutable, and M6 adds target immutability.
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select pg_temp.throws_any_ok(
  $$ update public.activities set distance_m = 14000 where id = '68000000-0000-4000-8000-000000000002' $$,
  'submitted Activity Evidence remains immutable'
);
update public.training_claims
set athlete_note = 'rewrite'
where id = '69000000-0000-4000-8000-000000000004';
select is(
  (select athlete_note from public.training_claims where id = '69000000-0000-4000-8000-000000000004'),
  'Stopped early because I was not feeling well.',
  'submitted Claim remains immutable under zero-row RLS update semantics'
);
reset role;

select pg_temp.throws_any_ok($$ update public.training_prescriptions set training_menu = 'MEDIUM' where id = '66000000-0000-4000-8000-000000000001' $$, 'submitted target training menu is locked');
select pg_temp.throws_any_ok($$ update public.training_prescriptions set scheduled_date = '2027-01-06' where id = '66000000-0000-4000-8000-000000000001' $$, 'submitted target scheduled date is locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set target_distance_m = 6000 where id = '67000000-0000-4000-8000-000000000001' $$, 'submitted target distance is locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set target_duration_sec = 3600 where id = '67000000-0000-4000-8000-000000000001' $$, 'submitted target duration is locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set target_pace_min_sec_per_km = 300 where id = '67000000-0000-4000-8000-000000000001' $$, 'submitted target pace is locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set repetitions = 10 where id = '67000000-0000-4000-8000-000000000002' $$, 'submitted repetitions are locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set distance_per_rep_m = 500 where id = '67000000-0000-4000-8000-000000000002' $$, 'submitted distance per repetition is locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set recovery_duration_sec = 120 where id = '67000000-0000-4000-8000-000000000002' $$, 'submitted recovery duration is locked');
select pg_temp.throws_any_ok($$ update public.prescription_components set instruction = 'Changed meaning' where id = '67000000-0000-4000-8000-000000000002' $$, 'submitted component instruction is locked');
select pg_temp.throws_any_ok($$ delete from public.prescription_components where id = '67000000-0000-4000-8000-000000000001' $$, 'submitted component cannot be deleted');
select pg_temp.throws_any_ok($$ insert into public.prescription_components (prescription_id, sequence_order, component_type, instruction) values ('66000000-0000-4000-8000-000000000001', 2, 'EASY', 'late change') $$, 'submitted component cannot be added');
select lives_ok($$ update public.training_prescriptions set title = 'Future Recovery Run' where id = '66000000-0000-4000-8000-000000000008' $$, 'future Prescription without submitted Claim remains mutable at the database boundary');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relname in ('claim_validations', 'validation_checks')), 'validation tables use forced RLS');
select ok((select bool_and(not has_table_privilege('anon', pg_class.oid, 'SELECT')) from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relname in ('claim_validations', 'validation_checks')), 'anonymous has no validation table privileges');
select is((select prosecdef from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where nspname = 'public' and proname = 'review_training_claim'), true, 'Coach review RPC is SECURITY DEFINER');
select is((select proconfig[1] from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where nspname = 'public' and proname = 'review_training_claim'), 'search_path=""', 'Coach review RPC uses an empty search_path');
select is((select prosecdef from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where nspname = 'public' and proname = 'evaluate_training_claim_internal'), false, 'internal evaluator is SECURITY INVOKER');
select ok(not has_function_privilege('anon', 'public.review_training_claim(uuid,text,text)', 'EXECUTE'), 'anonymous cannot execute review RPC');
select ok(not has_function_privilege('authenticated', 'public.evaluate_training_claim_internal(uuid)', 'EXECUTE'), 'application users cannot invoke internal evaluation directly');
select ok(to_regclass('public.strava_connections') is null, 'M6 introduces no Strava integration table');
select ok((select bool_and(status in ('DRAFT', 'SUBMITTED')) from public.training_claims), 'Claim lifecycle status remains separate from Validation result');

select * from finish();
rollback;
