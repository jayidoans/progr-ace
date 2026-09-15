begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('51000000-0000-0000-0000-000000000001', 'activity-a@example.test', '{"full_name":"Activity Athlete A"}'),
  ('51000000-0000-0000-0000-000000000002', 'activity-b@example.test', '{"full_name":"Activity Athlete B"}');

insert into public.activities (
  id, athlete_id, name, sport_type, started_at, duration_sec, source
) values (
  '52000000-0000-0000-0000-000000000002',
  '51000000-0000-0000-0000-000000000002',
  'Athlete B private activity',
  'WALKING',
  '2026-09-15T06:00:00+07:00',
  1800,
  'MANUAL'
);

set local role anon;
select throws_ok($$ select * from public.activities $$);
select throws_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at) values ('51000000-0000-0000-0000-000000000001', 'Anonymous', 'OTHER', now()) $$);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select lives_ok($$
  insert into public.activities (
    athlete_id, name, sport_type, started_at, distance_m, duration_sec,
    average_hr_bpm, rpe, notes
  ) values (
    '51000000-0000-0000-0000-000000000001',
    'Normal run', 'RUNNING', '2026-09-15T05:30:00+07:00', 5000, 2100,
    145, 4, 'Easy evidence'
  )
$$, 'athlete can create their own MANUAL activity');

select throws_ok($$
  insert into public.activities (athlete_id, name, sport_type, started_at)
  values ('51000000-0000-0000-0000-000000000002', 'Spoofed owner', 'OTHER', now())
$$);

select is((select count(*) from public.activities), 1::bigint, 'athlete reads their own activity');
select is((select count(*) from public.activities where athlete_id = '51000000-0000-0000-0000-000000000002'), 0::bigint, 'another athlete activity is hidden');

select lives_ok($$ update public.activities set name = 'Updated run' where name = 'Normal run' $$, 'athlete can update their own manual activity');
update public.activities set name = 'Intrusion' where id = '52000000-0000-0000-0000-000000000002';
select is((select count(*) from public.activities where name = 'Intrusion'), 0::bigint, 'athlete cannot update another athlete activity');

insert into public.activities (athlete_id, name, sport_type, started_at)
values ('51000000-0000-0000-0000-000000000001', 'Delete me', 'OTHER', now());
select lives_ok($$ delete from public.activities where name = 'Delete me' $$, 'athlete can delete their own manual activity');
delete from public.activities where id = '52000000-0000-0000-0000-000000000002';
select is((select count(*) from public.activities where id = '52000000-0000-0000-0000-000000000002'), 0::bigint, 'another athlete activity remains invisible after delete attempt');
reset role;
select is((select count(*) from public.activities where id = '52000000-0000-0000-0000-000000000002'), 1::bigint, 'another athlete activity was not deleted');
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select throws_ok($$
  insert into public.activities (athlete_id, name, sport_type, started_at, source)
  values ('51000000-0000-0000-0000-000000000001', 'Fake Strava', 'RUNNING', now(), 'STRAVA')
$$);
select throws_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, rpe) values ('51000000-0000-0000-0000-000000000001', 'Bad RPE 0', 'OTHER', now(), 0) $$);
select throws_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, rpe) values ('51000000-0000-0000-0000-000000000001', 'Bad RPE 11', 'OTHER', now(), 11) $$);
select lives_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, rpe) values ('51000000-0000-0000-0000-000000000001', 'RPE 1', 'OTHER', now(), 1) $$, 'RPE 1 is accepted');
select lives_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, rpe) values ('51000000-0000-0000-0000-000000000001', 'RPE 10', 'OTHER', now(), 10) $$, 'RPE 10 is accepted');
select throws_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, distance_m) values ('51000000-0000-0000-0000-000000000001', 'Negative distance', 'RUNNING', now(), -1) $$);
select throws_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, duration_sec) values ('51000000-0000-0000-0000-000000000001', 'Negative duration', 'OTHER', now(), -1) $$);
select lives_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, duration_sec) values ('51000000-0000-0000-0000-000000000001', 'Strength', 'STRENGTH_TRAINING', now(), 2700) $$, 'strength activity accepts null distance');
select lives_ok($$ insert into public.activities (athlete_id, name, sport_type, started_at, distance_m, duration_sec) values ('51000000-0000-0000-0000-000000000001', '7.39 km run', 'RUNNING', now(), 7390, 3402) $$, 'running activity accepts canonical distance and duration');
select is((select notes from public.activities where name = 'Updated run'), 'Easy evidence', 'private notes persist');

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relname = 'activities'),
  'activities uses forced RLS'
);
select ok(
  not has_column_privilege('authenticated', 'public.activities', 'source', 'INSERT')
  and not has_column_privilege('authenticated', 'public.activities', 'external_activity_id', 'INSERT')
  and not has_column_privilege('authenticated', 'public.activities', 'raw_data', 'INSERT'),
  'clients cannot supply evidence provider fields'
);
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activities'
      and column_name in ('prescription_id', 'training_prescription_id', 'claim_id', 'validation_id')
  ),
  0::bigint,
  'activity evidence has no direct prescription, claim, or validation coupling'
);
select is((select count(*) from public.training_claims), 0::bigint, 'athlete has no unrelated claims');
select is((select count(*) from public.claim_activities), 0::bigint, 'athlete has no unrelated claim evidence');

reset role;
select * from finish();
rollback;
