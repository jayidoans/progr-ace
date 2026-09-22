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

-- A submitted Claim using Strava evidence proves that the existing M5 trigger
-- remains authoritative during provider synchronization.
insert into public.training_prescriptions (
  id, training_week_id, training_menu, scheduled_date, title
) values (
  '81000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001',
  'EASY', '2027-01-08', 'M8 locked evidence fixture'
);
insert into public.prescription_components (
  id, prescription_id, sequence_order, component_type, target_distance_m
) values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 1, 'EASY', 5000
);
insert into public.activities (
  id, athlete_id, name, sport_type, started_at, distance_m, duration_sec,
  source, external_activity_id, raw_data
) values (
  '83000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000003',
  'Locked Strava snapshot', 'RUNNING', '2027-01-08T00:00:00Z', 5000, 1800,
  'STRAVA', '800002', '{"sport_type":"Run"}'
);
insert into public.training_claims (
  id, athlete_id, prescription_id
) values (
  '84000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000001'
);
insert into public.claim_activities (claim_id, activity_id) values (
  '84000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select public.submit_training_claim('84000000-0000-4000-8000-000000000001');
reset role;

set local role service_role;
insert into public.strava_access_permissions (user_id, allowed, granted_at)
values
  ('61000000-0000-4000-8000-000000000003', true, now()),
  ('61000000-0000-4000-8000-000000000004', true, now());
select public.upsert_strava_connection(
  '61000000-0000-4000-8000-000000000003', 800001, 'M8 Athlete A',
  array['read', 'activity:read_all'], 'CONNECTED',
  'cipher-a', 'iv-a', 'refresh-a', 'refresh-iv-a', now() + interval '6 hours'
);
select public.upsert_strava_connection(
  '61000000-0000-4000-8000-000000000004', 800002, 'M8 Athlete B',
  array['read', 'activity:read_all'], 'CONNECTED',
  'cipher-b', 'iv-b', 'refresh-b', 'refresh-iv-b', now() + interval '6 hours'
);
reset role;

set local role anon;
select pg_temp.throws_any_ok(
  $$ select * from public.claim_strava_activity_sync(
    '61000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000001', 60
  ) $$,
  'anonymous cannot acquire a Strava Activity sync lease'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select pg_temp.throws_any_ok(
  $$ select * from public.claim_strava_activity_sync(
    '61000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000001', 60
  ) $$,
  'browser-authenticated Athlete cannot call the privileged sync RPC'
);
select pg_temp.throws_any_ok(
  $$ insert into public.activities (
    athlete_id, name, sport_type, started_at, source, external_activity_id
  ) values (
    auth.uid(), 'Forged Strava', 'RUNNING', now(), 'STRAVA', 'forged'
  ) $$,
  'browser cannot forge Strava Activity evidence'
);
reset role;

set local role service_role;
select is(
  (select sync_state from public.claim_strava_activity_sync(
    '61000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000001', 60
  )), 'ACQUIRED', 'server acquires the first sync lease'
);
select is(
  (select sync_state from public.claim_strava_activity_sync(
    '61000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000002', 60
  )), 'BUSY', 'a concurrent sync receives BUSY'
);

create temporary table first_result as
select * from public.complete_strava_activity_sync(
  '61000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000001',
  '2026-09-17T05:00:00Z',
  '[
    {"external_activity_id":"800001","name":"Fresh Strava Run","sport_type":"RUNNING","started_at":"2026-09-17T00:00:00Z","distance_m":5000,"duration_sec":1800,"average_hr_bpm":150,"max_hr_bpm":170,"elevation_gain_m":25,"raw_data":{"sport_type":"Run"}},
    {"external_activity_id":"800002","name":"Provider changed locked row","sport_type":"RUNNING","started_at":"2027-01-08T00:00:00Z","distance_m":9000,"duration_sec":2000,"average_hr_bpm":155,"max_hr_bpm":175,"elevation_gain_m":30,"raw_data":{"sport_type":"Run"}}
  ]'::jsonb
);
select is((select created_count from first_result), 1, 'new Strava evidence is inserted once');
select is((select locked_count from first_result), 1, 'submitted evidence is counted as locked');
select is(
  (select rpe from public.activities where external_activity_id = '800001'),
  null::smallint,
  'new Strava evidence starts with null RPE'
);
select is(
  (select notes from public.activities where external_activity_id = '800001'),
  null::text,
  'new Strava evidence starts with null Notes'
);
select is(
  (select name from public.activities where external_activity_id = '800002'),
  'Locked Strava snapshot',
  'submitted evidence remains completely unchanged'
);
select is(
  (select activity_sync_cursor_at from public.strava_connections where athlete_id = '61000000-0000-4000-8000-000000000003'),
  '2026-09-17T05:00:00+00'::timestamptz,
  'successful sync advances the cursor to its start watermark'
);

update public.activities
set rpe = 7,
    notes = 'Athlete context must survive provider refreshes.'
where external_activity_id = '800001';

update public.strava_connections
set activity_sync_hour_started_at = null,
    activity_sync_attempt_count = 0
where athlete_id = '61000000-0000-4000-8000-000000000003';

select public.claim_strava_activity_sync(
  '61000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000003', 60
);
create temporary table retry_result as
select * from public.complete_strava_activity_sync(
  '61000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000003',
  '2026-09-17T06:00:00Z',
  '[{"external_activity_id":"800001","name":"Fresh Strava Run","sport_type":"RUNNING","started_at":"2026-09-17T00:00:00Z","distance_m":5000,"duration_sec":1800,"average_hr_bpm":150,"max_hr_bpm":170,"elevation_gain_m":25,"raw_data":{"sport_type":"Run"}}]'::jsonb
);
select is((select unchanged_count from retry_result), 1, 'identical retry is idempotent');
select is((select count(*) from public.activities where source = 'STRAVA' and external_activity_id = '800001'), 1::bigint, 'duplicate provider ID remains one row');

update public.strava_connections
set activity_sync_hour_started_at = null,
    activity_sync_attempt_count = 0
where athlete_id = '61000000-0000-4000-8000-000000000003';

select public.claim_strava_activity_sync(
  '61000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000004', 60
);
select is(
  (select updated_count from public.complete_strava_activity_sync(
    '61000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000004',
    '2026-09-17T07:00:00Z',
    '[{"external_activity_id":"800001","name":"Updated Strava Run","sport_type":"RUNNING","started_at":"2026-09-17T00:00:00Z","distance_m":5100,"duration_sec":1810,"average_hr_bpm":151,"max_hr_bpm":171,"elevation_gain_m":26,"raw_data":{"sport_type":"Run"}}]'::jsonb
  )), 1, 'unlocked Strava evidence updates'
);
select is(
  (select rpe from public.activities where external_activity_id = '800001'),
  7::smallint,
  'provider update preserves athlete-authored RPE'
);
select is(
  (select notes from public.activities where external_activity_id = '800001'),
  'Athlete context must survive provider refreshes.',
  'provider update preserves athlete-authored Notes'
);
select is((select name from public.activities where id = '68000000-0000-4000-8000-000000000001'), 'Morning Easy Run', 'manual Activity is never overwritten');

select public.claim_strava_activity_sync(
  '61000000-0000-4000-8000-000000000004',
  '85000000-0000-4000-8000-000000000005', 60
);
select pg_temp.throws_any_ok(
  $$ select * from public.complete_strava_activity_sync(
    '61000000-0000-4000-8000-000000000004',
    '85000000-0000-4000-8000-000000000005',
    '2026-09-17T08:00:00Z',
    '[{"external_activity_id":"800001","name":"Cross athlete overwrite","sport_type":"RUNNING","started_at":"2026-09-17T00:00:00Z","distance_m":1,"duration_sec":1,"average_hr_bpm":null,"max_hr_bpm":null,"elevation_gain_m":null,"raw_data":{"sport_type":"Run"}}]'::jsonb
  ) $$,
  'cross-athlete provider import is rejected'
);
select public.fail_strava_activity_sync(
  '61000000-0000-4000-8000-000000000004',
  '85000000-0000-4000-8000-000000000005',
  'FAILED', 'cross_athlete', false
);

select public.claim_strava_activity_sync(
  '61000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000006', 60
);
select ok(public.fail_strava_activity_sync(
  '61000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000006',
  'RATE_LIMITED', 'rate_limited', false
), 'rate-limited sync releases its lease');
select is(
  (select activity_sync_cursor_at from public.strava_connections where athlete_id = '61000000-0000-4000-8000-000000000003'),
  '2026-09-17T07:00:00+00'::timestamptz,
  'failed sync does not advance the cursor'
);

select ok(
  not has_function_privilege('authenticated', 'public.claim_strava_activity_sync(uuid,uuid,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.complete_strava_activity_sync(uuid,uuid,timestamptz,jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.fail_strava_activity_sync(uuid,uuid,text,text,boolean)', 'EXECUTE'),
  'all M8 sync RPCs are server-only'
);

update public.strava_connections
set activity_sync_hour_started_at = null,
    activity_sync_attempt_count = 0
where athlete_id = '61000000-0000-4000-8000-000000000004';

select public.claim_strava_activity_sync(
  '61000000-0000-4000-8000-000000000004',
  '85000000-0000-4000-8000-000000000007', 60
);
select public.complete_strava_activity_sync(
  '61000000-0000-4000-8000-000000000004',
  '85000000-0000-4000-8000-000000000007', now(), '[]'::jsonb
);
select public.claim_strava_activity_sync(
  '61000000-0000-4000-8000-000000000004',
  '85000000-0000-4000-8000-000000000008', 60
);
select public.complete_strava_activity_sync(
  '61000000-0000-4000-8000-000000000004',
  '85000000-0000-4000-8000-000000000008', now(), '[]'::jsonb
);
select is(
  (select sync_state from public.claim_strava_activity_sync(
    '61000000-0000-4000-8000-000000000004',
    '85000000-0000-4000-8000-000000000009', 60
  )),
  'RATE_LIMITED',
  'a third synchronization in the same clock hour is rejected'
);
select is(
  (select activity_sync_attempt_count from public.strava_connections
    where athlete_id = '61000000-0000-4000-8000-000000000004'),
  2::smallint,
  'rejected synchronization does not increment the hourly allowance'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000004', true);
select is((select count(*) from public.activities where external_activity_id = '800001'), 0::bigint, 'existing Activity RLS hides another athlete evidence');
reset role;

select * from finish();
rollback;
