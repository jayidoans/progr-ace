begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('e1300000-0000-4000-8000-000000000001', 'm13-athlete@example.test', '{"full_name":"M13 Athlete"}'),
  ('e1300000-0000-4000-8000-000000000002', 'm13-other-athlete@example.test', '{"full_name":"Other Athlete"}'),
  ('e1300000-0000-4000-8000-000000000003', 'm13-coach@example.test', '{"full_name":"M13 Coach"}'),
  ('e1300000-0000-4000-8000-000000000004', 'm13-other-coach@example.test', '{"full_name":"Other Coach"}'),
  ('e1300000-0000-4000-8000-000000000005', 'm13-admin@example.test', '{"full_name":"M13 Admin"}');

insert into public.user_roles (user_id, role_id)
select assignment.user_id, role.id
from (values
  ('e1300000-0000-4000-8000-000000000003'::uuid, 'COACH'),
  ('e1300000-0000-4000-8000-000000000004'::uuid, 'COACH'),
  ('e1300000-0000-4000-8000-000000000005'::uuid, 'ADMIN')
) assignment(user_id, role_name)
join public.roles role on role.name = assignment.role_name
on conflict do nothing;

insert into public.races (id, name, event_date, distance_m)
values ('e1310000-0000-4000-8000-000000000001', 'M13 Historical Race', current_date, 21097);

insert into public.athlete_race_goals (
  id, athlete_id, race_id, target_finish_time_sec, status
) values (
  'e1320000-0000-4000-8000-000000000001',
  'e1300000-0000-4000-8000-000000000001',
  'e1310000-0000-4000-8000-000000000001',
  7200,
  'ACTIVE'
);

insert into public.training_programs (
  id, race_goal_id, name, start_date, end_date, created_by
) values (
  'e1330000-0000-4000-8000-000000000001',
  'e1320000-0000-4000-8000-000000000001',
  'M13 Program',
  date_trunc('week', current_date::timestamp)::date,
  current_date,
  'e1300000-0000-4000-8000-000000000003'
);

insert into public.training_weeks (
  id, training_program_id, week_number, phase, start_date, end_date
) values (
  'e1340000-0000-4000-8000-000000000001',
  'e1330000-0000-4000-8000-000000000001',
  1,
  'Race',
  date_trunc('week', current_date::timestamp)::date,
  current_date
);

insert into public.training_prescriptions (
  id, training_week_id, training_menu, scheduled_date, title
) values (
  'e1350000-0000-4000-8000-000000000001',
  'e1340000-0000-4000-8000-000000000001',
  'EASY',
  current_date - 1,
  'M13 Run'
);

insert into public.prescription_components (
  prescription_id, sequence_order, component_type, target_distance_m
) values (
  'e1350000-0000-4000-8000-000000000001', 1, 'STEADY', 5000
);

update public.training_programs
set status = 'PUBLISHED'
where id = 'e1330000-0000-4000-8000-000000000001';

insert into public.activities (
  id, athlete_id, name, sport_type, started_at, distance_m, duration_sec, source
) values (
  'e1360000-0000-4000-8000-000000000001',
  'e1300000-0000-4000-8000-000000000001',
  'Claimed Run',
  'RUNNING',
  current_date - 1,
  5100,
  1500,
  'MANUAL'
);

insert into public.training_claims (
  id, athlete_id, prescription_id, status
) values (
  'e1370000-0000-4000-8000-000000000001',
  'e1300000-0000-4000-8000-000000000001',
  'e1350000-0000-4000-8000-000000000001',
  'DRAFT'
);

insert into public.claim_activities (claim_id, activity_id)
values (
  'e1370000-0000-4000-8000-000000000001',
  'e1360000-0000-4000-8000-000000000001'
);

update public.training_claims
set status = 'SUBMITTED', submitted_at = now()
where id = 'e1370000-0000-4000-8000-000000000001';

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select ok(
  not has_table_privilege('anon', 'public.training_programs', 'select'),
  'unauthenticated caller cannot read Program analytics input'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1300000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.training_programs where id = 'e1330000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete can read own published Program');
select is((select count(*) from public.training_claims where id = 'e1370000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete can read own submitted Claim');
select is((select count(*) from public.activities where id = 'e1360000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete can read own Activity evidence');

select set_config('request.jwt.claim.sub', 'e1300000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.training_programs where id = 'e1330000-0000-4000-8000-000000000001'), 0::bigint, 'unrelated Athlete cannot read another Athlete Program');
select is((select count(*) from public.activities where id = 'e1360000-0000-4000-8000-000000000001'), 0::bigint, 'unrelated Athlete cannot read Activity evidence');

select set_config('request.jwt.claim.sub', 'e1300000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.activities where id = 'e1360000-0000-4000-8000-000000000001'), 1::bigint, 'owning Coach can read submitted Activity evidence');

select set_config('request.jwt.claim.sub', 'e1300000-0000-4000-8000-000000000004', true);
select is((select count(*) from public.activities where id = 'e1360000-0000-4000-8000-000000000001'), 0::bigint, 'unrelated Coach cannot read Activity evidence');

select set_config('request.jwt.claim.sub', 'e1300000-0000-4000-8000-000000000005', true);
select is((select count(*) from public.activities where id = 'e1360000-0000-4000-8000-000000000001'), 1::bigint, 'Admin can read authorized Activity evidence');

select set_config('request.jwt.claim.sub', 'e1300000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$ select public.complete_coached_race_goal('e1320000-0000-4000-8000-000000000001') $$,
  'owning Coach can complete the historical Race Goal'
);
select is((select status from public.athlete_race_goals where id = 'e1320000-0000-4000-8000-000000000001'), 'COMPLETED', 'M12 Race Goal lifecycle remains authoritative');
select is((select count(*) from public.training_programs where id = 'e1330000-0000-4000-8000-000000000001'), 1::bigint, 'Program remains readable after Race Goal completion');

select * from finish();
rollback;
