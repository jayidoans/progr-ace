begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('e1430000-0000-4000-8000-000000000001', 'copy-coach@example.test', '{"full_name":"Copy Coach"}'),
  ('e1430000-0000-4000-8000-000000000002', 'copy-athlete@example.test', '{"full_name":"Copy Athlete"}'),
  ('e1430000-0000-4000-8000-000000000003', 'copy-other-coach@example.test', '{"full_name":"Other Coach"}'),
  ('e1430000-0000-4000-8000-000000000004', 'copy-other-athlete@example.test', '{"full_name":"Other Athlete"}');

insert into public.user_roles (user_id, role_id)
select 'e1430000-0000-4000-8000-000000000001', id from public.roles where name = 'COACH';
insert into public.user_roles (user_id, role_id)
select 'e1430000-0000-4000-8000-000000000003', id from public.roles where name = 'COACH';

insert into public.races (id, name, event_date, distance_m, location)
values
  ('e1431000-0000-4000-8000-000000000001', 'Copy Race', '2026-12-06', 42195, 'Jakarta'),
  ('e1431000-0000-4000-8000-000000000002', 'Other Race', '2026-12-13', 42195, 'Bandung');
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values
  ('e1432000-0000-4000-8000-000000000001', 'e1430000-0000-4000-8000-000000000002', 'e1431000-0000-4000-8000-000000000001', 15000, 'ACTIVE'),
  ('e1432000-0000-4000-8000-000000000002', 'e1430000-0000-4000-8000-000000000004', 'e1431000-0000-4000-8000-000000000002', 16000, 'ACTIVE');

insert into public.training_programs (id, race_goal_id, name, description, start_date, end_date, created_by, status)
values ('e1433000-0000-4000-8000-000000000001', 'e1432000-0000-4000-8000-000000000001', 'Source Plan', 'Keep this', '2026-08-03', '2026-12-06', 'e1430000-0000-4000-8000-000000000001', 'PUBLISHED');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status)
values ('e1434000-0000-4000-8000-000000000001', 'e1433000-0000-4000-8000-000000000001', 1, 'Build', '2026-08-03', '2026-08-09', 'PUBLISHED');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title, description)
values ('e1435000-0000-4000-8000-000000000001', 'e1434000-0000-4000-8000-000000000001', 'LONG', '2026-08-09', 'Long run', 'Source details');
insert into public.prescription_components (id, prescription_id, sequence_order, component_type, target_distance_m, target_duration_sec, instruction)
values ('e1436000-0000-4000-8000-000000000001', 'e1435000-0000-4000-8000-000000000001', 1, 'LONG', 20000, 7200, 'Steady');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1430000-0000-4000-8000-000000000001', true);
select set_config('test.copy_id', public.copy_training_program('e1433000-0000-4000-8000-000000000001', 'e1432000-0000-4000-8000-000000000001')::text, true);
select ok(current_setting('test.copy_id', true) is not null, 'authorized Coach can copy same-race program');
select is((select count(*) from public.training_programs where created_by = 'e1430000-0000-4000-8000-000000000001' and id <> 'e1433000-0000-4000-8000-000000000001'), 1::bigint, 'copy creates one new Program');
select is((select status from public.training_programs where id = current_setting('test.copy_id')::uuid), 'DRAFT', 'destination Program is draft');
select is((select count(*) from public.training_weeks where training_program_id = current_setting('test.copy_id')::uuid), 1::bigint, 'copy creates a new Week');
select is((select planning_status from public.training_weeks where training_program_id = current_setting('test.copy_id')::uuid), 'DRAFT', 'copied Week is draft');
select is((select count(*) from public.training_prescriptions where training_week_id in (select id from public.training_weeks where training_program_id = current_setting('test.copy_id')::uuid)), 1::bigint, 'copy creates a new Prescription');
select is((select count(*) from public.prescription_components where prescription_id in (select id from public.training_prescriptions where training_week_id in (select id from public.training_weeks where training_program_id = current_setting('test.copy_id')::uuid))), 1::bigint, 'copy creates a new Component');
select is((select description from public.training_programs where id = current_setting('test.copy_id')::uuid), 'Keep this', 'Program metadata is preserved');
select is((select tracking_start_date from public.training_programs where id = current_setting('test.copy_id')::uuid), current_date, 'copied Program uses destination adoption date');
select is((select target_distance_m from public.prescription_components where prescription_id in (select id from public.training_prescriptions where training_week_id in (select id from public.training_weeks where training_program_id = current_setting('test.copy_id')::uuid))), 20000, 'Prescription component values are preserved');
select is((select count(*) from public.training_programs where id = 'e1433000-0000-4000-8000-000000000001'), 1::bigint, 'source Program remains unchanged');

select throws_ok($$select public.copy_training_program('e1433000-0000-4000-8000-000000000001', 'e1432000-0000-4000-8000-000000000002')$$, '23514', null, 'different race is rejected');
select set_config('request.jwt.claim.sub', 'e1430000-0000-4000-8000-000000000003', true);
select throws_ok($$select public.copy_training_program('e1433000-0000-4000-8000-000000000001', 'e1432000-0000-4000-8000-000000000001')$$, '42501', null, 'unrelated Coach cannot copy source');
select set_config('request.jwt.claim.sub', 'e1430000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.copy_training_program('e1433000-0000-4000-8000-000000000001', 'e1432000-0000-4000-8000-000000000001')$$, '42501', null, 'Athlete cannot copy a program');
select set_config('request.jwt.claim.sub', 'e1430000-0000-4000-8000-000000000001', true);
select is((select start_date from public.training_programs where id <> 'e1433000-0000-4000-8000-000000000001' and race_goal_id = 'e1432000-0000-4000-8000-000000000001' and created_by = 'e1430000-0000-4000-8000-000000000001'), '2026-08-03'::date, 'program dates are preserved');
select is((select scheduled_date from public.training_prescriptions where training_week_id in (select id from public.training_weeks where training_program_id <> 'e1433000-0000-4000-8000-000000000001' and training_program_id in (select id from public.training_programs where race_goal_id = 'e1432000-0000-4000-8000-000000000001' and created_by = 'e1430000-0000-4000-8000-000000000001'))), '2026-08-09'::date, 'prescription dates are preserved');
select is((select count(*) from public.training_claims where prescription_id in (select id from public.training_prescriptions where training_week_id in (select id from public.training_weeks where training_program_id <> 'e1433000-0000-4000-8000-000000000001' and training_program_id in (select id from public.training_programs where race_goal_id = 'e1432000-0000-4000-8000-000000000001' and created_by = 'e1430000-0000-4000-8000-000000000001')))), 0::bigint, 'Claims are not copied');
select is((select count(*) from public.training_programs where race_goal_id = 'e1432000-0000-4000-8000-000000000002'), 0::bigint, 'different-race goal remains untouched');

reset role;
select * from finish();
rollback;
