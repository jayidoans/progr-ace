begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.denied(p_sql text, p_description text)
returns text language plpgsql as $$
begin execute p_sql; return extensions.ok(false, p_description);
exception when others then return extensions.ok(true, p_description); end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('b1100000-0000-4000-8000-000000000001', 'm111-coach@example.test', '{"full_name":"M11 Coach"}'),
  ('b1100000-0000-4000-8000-000000000002', 'm111-athlete@example.test', '{"full_name":"M11 Athlete"}'),
  ('b1100000-0000-4000-8000-000000000003', 'm111-other-coach@example.test', '{"full_name":"Other Coach"}');
insert into public.user_roles (user_id, role_id)
select 'b1100000-0000-4000-8000-000000000001', id from public.roles where name='COACH'
on conflict do nothing;
insert into public.user_roles (user_id, role_id)
select 'b1100000-0000-4000-8000-000000000003', id from public.roles where name='COACH'
on conflict do nothing;

insert into public.races (id, name, event_date, distance_m)
values ('b1200000-0000-4000-8000-000000000001', 'M11 Race', '2099-01-18', 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('b1300000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-000000000002', 'b1200000-0000-4000-8000-000000000001', 14400, 'ACTIVE');

insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by)
values ('b1400000-0000-4000-8000-000000000001', 'b1300000-0000-4000-8000-000000000001', 'Progressive Program', '2099-01-05', '2099-01-18', 'b1100000-0000-4000-8000-000000000001');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date)
values
  ('b1500000-0000-4000-8000-000000000001', 'b1400000-0000-4000-8000-000000000001', 1, 'Base', '2099-01-05', '2099-01-11'),
  ('b1500000-0000-4000-8000-000000000002', 'b1400000-0000-4000-8000-000000000001', 2, 'Build', '2099-01-12', '2099-01-18');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title)
values ('b1600000-0000-4000-8000-000000000001', 'b1500000-0000-4000-8000-000000000001', 'EASY', '2099-01-06', 'Future Easy');
insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m)
values ('b1600000-0000-4000-8000-000000000001', 1, 'EASY', 5000);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000001', true);
select is((select planning_status from public.training_weeks where id='b1500000-0000-4000-8000-000000000001'), 'DRAFT', 'new week in a draft program defaults to DRAFT');
select is((select count(*) from public.training_weeks where training_program_id='b1400000-0000-4000-8000-000000000001' and planning_status='PUBLISHED'), 0::bigint, 'DRAFT and PUBLISHED weeks remain distinguishable');

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.training_weeks where training_program_id='b1400000-0000-4000-8000-000000000001'), 0::bigint, 'unrelated Coach cannot inspect another Coach draft weeks');

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.training_weeks where training_program_id='b1400000-0000-4000-8000-000000000001'), 0::bigint, 'Athlete cannot see draft weekly schedule');
select pg_temp.denied($$ insert into public.training_claims (athlete_id, prescription_id) values ('b1100000-0000-4000-8000-000000000002','b1600000-0000-4000-8000-000000000001') $$, 'Athlete cannot claim a DRAFT weekly prescription');

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000001', true);
select lives_ok($$ update public.training_programs set status='PUBLISHED' where id='b1400000-0000-4000-8000-000000000001' $$, 'publishing the complete program remains supported');
select is((select count(*) from public.training_weeks where training_program_id='b1400000-0000-4000-8000-000000000001' and planning_status='PUBLISHED'), 2::bigint, 'program publication publishes all existing imported-style weeks');

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.training_weeks where training_program_id='b1400000-0000-4000-8000-000000000001'), 2::bigint, 'Athlete sees published weekly schedule');
select is((select count(*) from public.training_prescriptions where id='b1600000-0000-4000-8000-000000000001'), 1::bigint, 'published Prescription remains assigned and visible');
select lives_ok($$ insert into public.training_claims (athlete_id, prescription_id) values ('b1100000-0000-4000-8000-000000000002','b1600000-0000-4000-8000-000000000001') $$, 'normal Claim flow remains available for a PUBLISHED weekly prescription');

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000001', true);
select pg_temp.denied($$ insert into public.training_programs (race_goal_id, name, start_date, end_date, created_by) values ('b1300000-0000-4000-8000-000000000001','Past Race','2099-01-05','2099-01-19','b1100000-0000-4000-8000-000000000001') $$, 'Program cannot exceed its Race Date');
select pg_temp.denied($$ update public.training_programs set end_date='2099-01-19' where id='b1400000-0000-4000-8000-000000000001' $$, 'published Program boundary remains immutable and cannot be extended');
select pg_temp.denied($$ insert into public.training_weeks (training_program_id, week_number, phase, start_date, end_date) values ('b1400000-0000-4000-8000-000000000001',3,'Beyond','2099-01-19','2099-01-25') $$, 'week cannot exceed Program and Race boundaries');

select ok(not exists(
  select 1 from public.training_weeks where planning_status not in ('DRAFT','PUBLISHED')
), 'UNPLANNED is represented by a missing week row rather than a fake database week');
select ok(not has_function_privilege('authenticated', 'public.protect_claim_week_publication()', 'execute'), 'Claim publication guard is not browser-callable');
select ok(not has_function_privilege('authenticated', 'public.validate_training_program_race_boundary()', 'execute'), 'Race boundary trigger function is not browser-callable');

reset role;
select * from finish();
rollback;
