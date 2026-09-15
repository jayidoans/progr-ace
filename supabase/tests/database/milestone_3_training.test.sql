begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(25);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('41000000-0000-0000-0000-000000000001', 'coach@example.test', '{"full_name":"Coach"}'),
  ('41000000-0000-0000-0000-000000000002', 'athlete-a@example.test', '{"full_name":"Athlete A"}'),
  ('41000000-0000-0000-0000-000000000003', 'athlete-b@example.test', '{"full_name":"Athlete B"}'),
  ('41000000-0000-0000-0000-000000000004', 'admin-m3@example.test', '{"full_name":"Admin M3"}');

insert into public.user_roles (user_id, role_id)
select '41000000-0000-0000-0000-000000000001', id from public.roles where name = 'COACH'
on conflict do nothing;
insert into public.user_roles (user_id, role_id)
select '41000000-0000-0000-0000-000000000004', id from public.roles where name = 'ADMIN'
on conflict do nothing;

insert into public.races (id, name, event_date, distance_m, location)
values ('42000000-0000-0000-0000-000000000001', 'M3 Marathon', '2026-11-01', 42195, 'Jakarta');
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values
  ('43000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 14400, 'ACTIVE'),
  ('43000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000001', 15000, 'ACTIVE');

set local role anon;
select throws_ok($$ select * from public.training_programs $$);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000002', true);
select throws_ok($$
  insert into public.training_programs (race_goal_id, name, start_date, end_date, created_by)
  values ('43000000-0000-0000-0000-000000000001', 'Athlete attempt', '2026-07-20', '2026-07-26', '41000000-0000-0000-0000-000000000002')
$$);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select lives_ok($$
  insert into public.training_programs (race_goal_id, name, start_date, end_date, created_by)
  values ('43000000-0000-0000-0000-000000000001', 'Program A', '2026-07-20', '2026-07-26', '41000000-0000-0000-0000-000000000001')
$$, 'COACH can create a draft program');
insert into public.training_programs (race_goal_id, name, start_date, end_date, created_by)
values
  ('43000000-0000-0000-0000-000000000001', 'Program B', '2026-07-20', '2026-07-26', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', 'Unrelated Program', '2026-07-20', '2026-07-26', '41000000-0000-0000-0000-000000000001');

insert into public.training_weeks (training_program_id, week_number, phase, start_date, end_date)
values
  ((select id from public.training_programs where name = 'Program A'), 1, 'Build A', '2026-07-20', '2026-07-26'),
  ((select id from public.training_programs where name = 'Program B'), 1, 'Build B', '2026-07-20', '2026-07-26'),
  ((select id from public.training_programs where name = 'Unrelated Program'), 1, 'Build Other', '2026-07-20', '2026-07-26');

select throws_ok($$
  insert into public.training_weeks (training_program_id, week_number, phase, start_date, end_date)
  values ((select id from public.training_programs where name = 'Program A'), 1, 'Duplicate', '2026-07-20', '2026-07-26')
$$);

insert into public.training_prescriptions (training_week_id, training_menu, scheduled_date, title)
values
  ((select id from public.training_weeks where phase = 'Build A'), 'EASY', '2026-07-21', 'A Tue Easy'),
  ((select id from public.training_weeks where phase = 'Build A'), 'SPEED', '2026-07-22', 'A Wed Speed'),
  ((select id from public.training_weeks where phase = 'Build A'), 'STRENGTH', '2026-07-23', 'A Thu Strength'),
  ((select id from public.training_weeks where phase = 'Build A'), 'MEDIUM', '2026-07-24', 'A Fri Medium'),
  ((select id from public.training_weeks where phase = 'Build A'), 'LONG', '2026-07-26', 'A Sun Long'),
  ((select id from public.training_weeks where phase = 'Build B'), 'EASY', '2026-07-20', 'B Mon Easy'),
  ((select id from public.training_weeks where phase = 'Build B'), 'STRENGTH', '2026-07-21', 'B Tue Strength'),
  ((select id from public.training_weeks where phase = 'Build B'), 'SPEED', '2026-07-23', 'B Thu Speed'),
  ((select id from public.training_weeks where phase = 'Build B'), 'LONG', '2026-07-25', 'B Sat Long'),
  ((select id from public.training_weeks where phase = 'Build Other'), 'EASY', '2026-07-20', 'Other Easy');

select throws_ok($$
  insert into public.training_prescriptions (training_week_id, training_menu, scheduled_date, title)
  values ((select id from public.training_weeks where phase = 'Build A'), 'REST', '2026-07-20', 'Rest')
$$);

select is((select count(*) from public.training_prescriptions where training_week_id = (select id from public.training_weeks where phase = 'Build A')), 5::bigint, 'rest days need no rows');
select is((select count(distinct extract(isodow from scheduled_date)) from public.training_prescriptions where training_week_id in (select id from public.training_weeks where phase in ('Build A', 'Build B'))), 7::bigint, 'prescriptions can use every weekday');
select ok(exists(select 1 from public.training_prescriptions where title = 'A Tue Easy') and exists(select 1 from public.training_prescriptions where title = 'B Mon Easy'), 'the same menu works on different weekdays');

insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m, instruction)
values
  ((select id from public.training_prescriptions where title = 'A Wed Speed'), 1, 'EASY', 3000, 'Warm-up'),
  ((select id from public.training_prescriptions where title = 'A Wed Speed'), 2, 'TEMPO', 8000, 'Tempo'),
  ((select id from public.training_prescriptions where title = 'A Wed Speed'), 3, 'EASY', 3000, 'Cool-down');
select results_eq($$ select sequence_order from public.prescription_components where prescription_id = (select id from public.training_prescriptions where title = 'A Wed Speed') order by sequence_order $$, $$ values (1), (2), (3) $$, 'composite ordering is preserved');
select throws_ok($$ insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m) values ((select id from public.training_prescriptions where title = 'A Tue Easy'), 1, 'EASY', -1) $$);
select throws_ok($$ insert into public.prescription_components (prescription_id, sequence_order, component_type, target_duration_sec) values ((select id from public.training_prescriptions where title = 'A Tue Easy'), 1, 'EASY', -1) $$);
select throws_ok($$ insert into public.prescription_components (prescription_id, sequence_order, component_type, repetitions) values ((select id from public.training_prescriptions where title = 'A Tue Easy'), 1, 'INTERVAL', 0) $$);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.training_programs), 0::bigint, 'athlete cannot see draft programs');
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
update public.training_programs set status = 'PUBLISHED' where name = 'Program A';
update public.training_programs set status = 'PUBLISHED' where name = 'Unrelated Program';

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.training_programs), 1::bigint, 'athlete reads only their published program');
select is((select count(*) from public.training_programs where name = 'Unrelated Program'), 0::bigint, 'unrelated athlete program is hidden');
update public.training_programs set name = 'Athlete rewrite' where name = 'Program A';
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select is((select name from public.training_programs where name = 'Program A'), 'Program A', 'athlete cannot modify a program');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relname in ('training_programs','training_weeks','training_prescriptions','prescription_components','training_import_previews')), 'Milestone 3 tables use forced RLS');
select ok((select bool_and(relrowsecurity and relforcerowsecurity and not has_table_privilege('anon', pg_class.oid, 'SELECT')) from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relname in ('training_claims','claim_activities')), 'claim-domain tables retain forced RLS and no anonymous reads');

insert into public.training_import_previews (created_by, race_goal_id, source_hash, template_version, payload)
values (
  '41000000-0000-0000-0000-000000000001',
  '43000000-0000-0000-0000-000000000001',
  repeat('a', 64), 1,
  '{"name":"Imported Program","description":null,"startDate":"2026-08-03","endDate":"2026-08-09","weeks":[{"weekNumber":1,"phase":"Build","startDate":"2026-08-03","endDate":"2026-08-09","prescriptions":[{"session":"s1","scheduledDate":"2026-08-06","trainingMenu":"SPEED","title":"8 x 400 m","description":null,"components":[{"sequenceOrder":1,"componentType":"INTERVAL","targetDistanceM":null,"targetDurationSec":null,"repetitions":8,"distancePerRepM":400,"recoveryDurationSec":90,"targetPaceMinSecPerKm":null,"targetPaceMaxSecPerKm":null,"instruction":"Controlled"}]}]}]}'::jsonb
);
select set_config('test.preview_id', (select id::text from public.training_import_previews where source_hash = repeat('a', 64)), true);
select ok(set_config('test.imported_program_id', public.confirm_training_import(current_setting('test.preview_id')::uuid)::text, true) is not null, 'atomic import succeeds');
select is((select status from public.training_programs where name = 'Imported Program'), 'DRAFT', 'import creates a draft');
select is(public.confirm_training_import(current_setting('test.preview_id')::uuid), current_setting('test.imported_program_id')::uuid, 'duplicate confirmation is idempotent');
select is((select count(*) from public.training_programs where name = 'Imported Program'), 1::bigint, 'idempotency prevents duplicate programs');

insert into public.training_import_previews (created_by, race_goal_id, source_hash, template_version, payload)
values ('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', repeat('b', 64), 1,
  '{"name":"Rollback Program","description":null,"startDate":"2026-08-03","endDate":"2026-08-09","weeks":[{"weekNumber":1,"phase":"Build","startDate":"2026-08-03","endDate":"2026-08-09","prescriptions":[{"session":"bad","scheduledDate":"2026-08-10","trainingMenu":"EASY","title":"Outside week","description":null,"components":[{"sequenceOrder":1,"componentType":"EASY","targetDistanceM":5000,"targetDurationSec":null,"repetitions":null,"distancePerRepM":null,"recoveryDurationSec":null,"targetPaceMinSecPerKm":null,"targetPaceMaxSecPerKm":null,"instruction":null}]}]}]}'::jsonb);
select set_config('test.failed_preview_id', (select id::text from public.training_import_previews where source_hash = repeat('b', 64)), true);
select throws_ok($$ select public.confirm_training_import(current_setting('test.failed_preview_id')::uuid) $$);
select is((select count(*) from public.training_programs where name = 'Rollback Program'), 0::bigint, 'failed import leaves no partial program');

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000002', true);
select throws_ok($$ select public.confirm_training_import(current_setting('test.preview_id')::uuid) $$);

reset role;
select * from finish();
rollback;
