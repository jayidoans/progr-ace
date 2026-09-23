begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('e1130000-0000-4000-8000-000000000001', 'adoption-coach@example.test', '{"full_name":"Adoption Coach"}'),
  ('e1130000-0000-4000-8000-000000000002', 'adoption-athlete@example.test', '{"full_name":"Adoption Athlete"}');
insert into public.user_roles (user_id, role_id)
select 'e1130000-0000-4000-8000-000000000001', id from public.roles where name = 'COACH';
insert into public.races (id, name, event_date, distance_m, location)
values ('e1131000-0000-4000-8000-000000000001', 'Adoption Race', '2099-12-06', 42195, 'Jakarta');
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('e1132000-0000-4000-8000-000000000001', 'e1130000-0000-4000-8000-000000000002', 'e1131000-0000-4000-8000-000000000001', 15000, 'ACTIVE');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1130000-0000-4000-8000-000000000001', true);

select lives_ok($$insert into public.training_programs (race_goal_id, name, start_date, end_date, created_by) values ('e1132000-0000-4000-8000-000000000001', 'Historical manual plan', '2026-06-22', '2099-12-05', 'e1130000-0000-4000-8000-000000000001')$$, 'historical Program start is allowed');
select is((select tracking_start_date from public.training_programs where name = 'Historical manual plan'), current_date, 'new Program tracks from adoption date');
select lives_ok($$insert into public.training_weeks (training_program_id, week_number, phase, start_date, end_date) values ((select id from public.training_programs where name = 'Historical manual plan'), 1, 'Base', '2026-06-22', '2026-06-28')$$, 'historical Week is allowed');
select lives_ok($$insert into public.training_prescriptions (training_week_id, training_menu, scheduled_date, title) values ((select id from public.training_weeks where phase = 'Base'), 'EASY', '2026-06-22', 'Historical session')$$, 'historical Prescription is allowed');

insert into public.training_import_previews (created_by, race_goal_id, source_hash, template_version, payload)
values ('e1130000-0000-4000-8000-000000000001', 'e1132000-0000-4000-8000-000000000001', repeat('e', 64), 1,
  '{"name":"Historical imported plan","description":null,"startDate":"2026-06-22","endDate":"2026-06-28","weeks":[{"weekNumber":1,"phase":"Base","startDate":"2026-06-22","endDate":"2026-06-28","prescriptions":[{"session":"old","scheduledDate":"2026-06-22","trainingMenu":"EASY","title":"Historical easy","description":null,"components":[{"sequenceOrder":1,"componentType":"EASY","targetDistanceM":5000,"targetDurationSec":null,"repetitions":null,"distancePerRepM":null,"recoveryDurationSec":null,"targetPaceMinSecPerKm":null,"targetPaceMaxSecPerKm":null,"instruction":"Easy"}]}]}]}'::jsonb);
select lives_ok($$select public.confirm_training_import((select id from public.training_import_previews where source_hash = repeat('e', 64)))$$, 'historical XLSX plan can be imported');
select is((select start_date from public.training_programs where name = 'Historical imported plan'), '2026-06-22'::date, 'import preserves historical training start');
select is((select tracking_start_date from public.training_programs where name = 'Historical imported plan'), current_date, 'import uses adoption date for tracking');
select is((select count(*) from public.training_programs where name = 'Historical imported plan'), 1::bigint, 'historical import creates one Program');
select is((select planning_status from public.training_weeks where training_program_id = (select id from public.training_programs where name = 'Historical imported plan')), 'DRAFT', 'historical imported Week starts as draft');
select is((select count(*) from public.training_claims where prescription_id in (select id from public.training_prescriptions where training_week_id in (select id from public.training_weeks where training_program_id = (select id from public.training_programs where name = 'Historical imported plan')))), 0::bigint, 'historical adoption creates no Claims');

reset role;
select * from finish();
rollback;
