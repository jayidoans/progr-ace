begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.denied(p_sql text, p_description text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when others then
  return extensions.ok(true, p_description);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('e1800000-0000-4000-8000-000000000001', 'extension-coach@example.test', '{"full_name":"Extension Coach"}'),
  ('e1800000-0000-4000-8000-000000000002', 'extension-athlete@example.test', '{"full_name":"Extension Athlete"}'),
  ('e1800000-0000-4000-8000-000000000003', 'extension-other-coach@example.test', '{"full_name":"Other Extension Coach"}');

insert into public.user_roles (user_id, role_id)
select 'e1800000-0000-4000-8000-000000000001', id from public.roles where name = 'COACH';
insert into public.user_roles (user_id, role_id)
select 'e1800000-0000-4000-8000-000000000003', id from public.roles where name = 'COACH';

insert into public.races (id, name, event_date, distance_m)
values ('e1810000-0000-4000-8000-000000000001', 'Extension Race', '2099-10-18', 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('e1820000-0000-4000-8000-000000000001', 'e1800000-0000-4000-8000-000000000002', 'e1810000-0000-4000-8000-000000000001', 14400, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by)
values ('e1830000-0000-4000-8000-000000000001', 'e1820000-0000-4000-8000-000000000001', 'One week progressive plan', '2099-09-21', '2099-09-27', 'e1800000-0000-4000-8000-000000000001');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date)
values ('e1840000-0000-4000-8000-000000000001', 'e1830000-0000-4000-8000-000000000001', 1, 'Base', '2099-09-21', '2099-09-27');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title)
values ('e1850000-0000-4000-8000-000000000001', 'e1840000-0000-4000-8000-000000000001', 'EASY', '2099-09-22', 'Published easy run');
insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m)
values ('e1850000-0000-4000-8000-000000000001', 1, 'EASY', 5000);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1800000-0000-4000-8000-000000000001', true);
update public.training_programs set status = 'PUBLISHED' where id = 'e1830000-0000-4000-8000-000000000001';

select is((select planning_status from public.training_weeks where id = 'e1840000-0000-4000-8000-000000000001'), 'PUBLISHED', 'existing published week remains published');
select is((select count(*) from public.training_prescriptions where id = 'e1850000-0000-4000-8000-000000000001'), 1::bigint, 'existing published sessions remain intact before extension');

select set_config('request.jwt.claim.sub', 'e1800000-0000-4000-8000-000000000002', true);
select pg_temp.denied(
  $$ select public.extend_and_start_next_training_week('e1830000-0000-4000-8000-000000000001') $$,
  'Athlete cannot extend a Coach-owned published Program'
);
select set_config('request.jwt.claim.sub', 'e1800000-0000-4000-8000-000000000003', true);
select pg_temp.denied(
  $$ select public.extend_and_start_next_training_week('e1830000-0000-4000-8000-000000000001') $$,
  'unrelated Coach cannot extend another Coach Program'
);

select set_config('request.jwt.claim.sub', 'e1800000-0000-4000-8000-000000000001', true);
select ok(set_config('test.next_week_id', public.extend_and_start_next_training_week('e1830000-0000-4000-8000-000000000001')::text, true) is not null, 'authorized Coach extends the Program and intentionally starts the next week');
select is((select end_date from public.training_programs where id = 'e1830000-0000-4000-8000-000000000001'), '2099-10-18'::date, 'extension ends exactly on the Race Date');
select is((select planning_status from public.training_weeks where id = current_setting('test.next_week_id')::uuid), 'DRAFT', 'next week is created as a DRAFT');
select is((select start_date::text || '/' || end_date::text from public.training_weeks where id = current_setting('test.next_week_id')::uuid), '2099-09-28/2099-10-04', 'next draft week uses the following program calendar week');
select is((select count(*) from public.training_weeks where training_program_id = 'e1830000-0000-4000-8000-000000000001' and week_number = 2), 1::bigint, 'extension creates exactly one next week');
select is((select planning_status from public.training_weeks where id = 'e1840000-0000-4000-8000-000000000001'), 'PUBLISHED', 'extension does not modify prior published week state');
select is((select count(*) from public.training_prescriptions where id = 'e1850000-0000-4000-8000-000000000001'), 1::bigint, 'extension does not rewrite prior published sessions');
select pg_temp.denied(
  $$ select public.extend_and_start_next_training_week('e1830000-0000-4000-8000-000000000001') $$,
  'repeated extension cannot create another draft after the Race Date boundary is reached'
);

reset role;
select * from finish();
rollback;
