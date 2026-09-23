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
  ('d1400000-0000-4000-8000-000000000001', 'm14-athlete@example.test', '{"full_name":"M14 Athlete"}'),
  ('d1400000-0000-4000-8000-000000000002', 'm14-other@example.test', '{"full_name":"Other Athlete"}'),
  ('d1400000-0000-4000-8000-000000000003', 'm14-coach@example.test', '{"full_name":"M14 Coach"}'),
  ('d1400000-0000-4000-8000-000000000004', 'm14-other-coach@example.test', '{"full_name":"Other Coach"}'),
  ('d1400000-0000-4000-8000-000000000005', 'm14-admin@example.test', '{"full_name":"M14 Admin"}'),
  ('d1400000-0000-4000-8000-000000000006', 'm14-today-athlete@example.test', '{"full_name":"Today Athlete"}'),
  ('d1400000-0000-4000-8000-000000000007', 'm14-future-athlete@example.test', '{"full_name":"Future Athlete"}');

insert into public.user_roles (user_id, role_id)
select assignment.user_id, role.id
from (values
  ('d1400000-0000-4000-8000-000000000001'::uuid, 'ATHLETE'),
  ('d1400000-0000-4000-8000-000000000002'::uuid, 'ATHLETE'),
  ('d1400000-0000-4000-8000-000000000003'::uuid, 'COACH'),
  ('d1400000-0000-4000-8000-000000000004'::uuid, 'COACH'),
  ('d1400000-0000-4000-8000-000000000005'::uuid, 'ADMIN'),
  ('d1400000-0000-4000-8000-000000000006'::uuid, 'ATHLETE'),
  ('d1400000-0000-4000-8000-000000000007'::uuid, 'ATHLETE')
) assignment(user_id, role_name)
join public.roles role on role.name = assignment.role_name
on conflict do nothing;

insert into public.races (id, name, event_date, distance_m) values
  ('d1410000-0000-4000-8000-000000000001', 'M14 Past Race', current_date - 1, 42195),
  ('d1410000-0000-4000-8000-000000000002', 'M14 Today Race', current_date, 10000),
  ('d1410000-0000-4000-8000-000000000003', 'M14 Future Race', current_date + 1, 21097),
  ('d1410000-0000-4000-8000-000000000004', 'M14 Cancelled Race', current_date - 1, 5000);

insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status) values
  ('d1420000-0000-4000-8000-000000000001', 'd1400000-0000-4000-8000-000000000001', 'd1410000-0000-4000-8000-000000000001', 13500, 'ACTIVE'),
  ('d1420000-0000-4000-8000-000000000002', 'd1400000-0000-4000-8000-000000000002', 'd1410000-0000-4000-8000-000000000001', 14400, 'ACTIVE'),
  ('d1420000-0000-4000-8000-000000000003', 'd1400000-0000-4000-8000-000000000006', 'd1410000-0000-4000-8000-000000000002', 3600, 'ACTIVE'),
  ('d1420000-0000-4000-8000-000000000004', 'd1400000-0000-4000-8000-000000000007', 'd1410000-0000-4000-8000-000000000003', 7200, 'ACTIVE'),
  ('d1420000-0000-4000-8000-000000000005', 'd1400000-0000-4000-8000-000000000002', 'd1410000-0000-4000-8000-000000000004', 1800, 'CANCELLED');

insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by, status) values
  ('d1430000-0000-4000-8000-000000000001', 'd1420000-0000-4000-8000-000000000002', 'M14 Coach Program', current_date - 10, current_date - 1, 'd1400000-0000-4000-8000-000000000003', 'PUBLISHED'),
  ('d1430000-0000-4000-8000-000000000002', 'd1420000-0000-4000-8000-000000000001', 'M14 Other Coach Program', current_date - 10, current_date - 1, 'd1400000-0000-4000-8000-000000000004', 'PUBLISHED');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.create_race_result('d1420000-0000-4000-8000-000000000001', 'FINISHED', 13800, 'Strong finish')$$, 'Athlete can record own finished result after Race Date');
select is((select recorded_by from public.race_results where athlete_race_goal_id='d1420000-0000-4000-8000-000000000001'), 'd1400000-0000-4000-8000-000000000001'::uuid, 'recorded_by is the authenticated actor');
select pg_temp.denied($$select public.create_race_result('d1420000-0000-4000-8000-000000000001', 'DNS', null, null)$$, 'Duplicate Race Result is rejected');
select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000006', true);
select lives_ok($$select public.create_race_result('d1420000-0000-4000-8000-000000000003', 'DNS', null, null)$$, 'Race Result is allowed on Race Date');
select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000007', true);
select pg_temp.denied($$select public.create_race_result('d1420000-0000-4000-8000-000000000004', 'DNS', null, null)$$, 'Race Result before Race Date is rejected');
select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000001', true);
select pg_temp.denied($$select public.create_race_result('d1420000-0000-4000-8000-000000000002', 'FINISHED', 1000, null)$$, 'Athlete cannot create another Athlete result');
select pg_temp.denied($$select public.create_race_result('d1420000-0000-4000-8000-000000000005', 'DNS', null, null)$$, 'Cancelled Race Goal cannot receive a new result');

select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000003', true);
select lives_ok($$select public.create_race_result('d1420000-0000-4000-8000-000000000002', 'DNF', null, 'Stopped at 32 km')$$, 'Coach with owned Training Program can record result');
select is((select recorded_by from public.race_results where athlete_race_goal_id='d1420000-0000-4000-8000-000000000002'), 'd1400000-0000-4000-8000-000000000003'::uuid, 'Coach is recorded as original actor');
select pg_temp.denied($$select public.create_race_result('d1420000-0000-4000-8000-000000000001', 'DNS', null, null)$$, 'Unrelated Coach cannot create result');
select lives_ok($$select public.update_race_result((select id from public.race_results where athlete_race_goal_id='d1420000-0000-4000-8000-000000000002'), 'FINISHED', 14000, 'Corrected finish')$$, 'Authorized Coach can correct result');
select is((select recorded_by from public.race_results where athlete_race_goal_id='d1420000-0000-4000-8000-000000000002'), 'd1400000-0000-4000-8000-000000000003'::uuid, 'Correction preserves original recorded_by');

select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000004', true);
select pg_temp.denied($$select public.create_race_result('d1420000-0000-4000-8000-000000000001', 'DNS', null, null)$$, 'Other Coach cannot access unrelated goal');

select set_config('request.jwt.claim.sub', 'd1400000-0000-4000-8000-000000000005', true);
select lives_ok($$select public.update_race_result((select id from public.race_results where athlete_race_goal_id='d1420000-0000-4000-8000-000000000001'), 'FINISHED', 13200, null)$$, 'Admin can correct Race Result');

reset role;
select is((select status from public.athlete_race_goals where id='d1420000-0000-4000-8000-000000000001'), 'ACTIVE', 'Race Result does not change Race Goal status');
select is((select completed_at from public.athlete_race_goals where id='d1420000-0000-4000-8000-000000000001'), null, 'Race Result does not set completed_at');

select pg_temp.denied($$insert into public.race_results (athlete_race_goal_id, status, finish_time_sec, recorded_by) values ('d1420000-0000-4000-8000-000000000004', 'FINISHED', null, 'd1400000-0000-4000-8000-000000000001')$$, 'FINISHED without time is rejected');
select pg_temp.denied($$insert into public.race_results (athlete_race_goal_id, status, finish_time_sec, recorded_by) values ('d1420000-0000-4000-8000-000000000004', 'FINISHED', 0, 'd1400000-0000-4000-8000-000000000001')$$, 'FINISHED zero time is rejected');
select pg_temp.denied($$insert into public.race_results (athlete_race_goal_id, status, finish_time_sec, recorded_by) values ('d1420000-0000-4000-8000-000000000004', 'FINISHED', -1, 'd1400000-0000-4000-8000-000000000001')$$, 'FINISHED negative time is rejected');
select pg_temp.denied($$insert into public.race_results (athlete_race_goal_id, status, finish_time_sec, recorded_by) values ('d1420000-0000-4000-8000-000000000004', 'DNF', 10, 'd1400000-0000-4000-8000-000000000001')$$, 'DNF with time is rejected');
select pg_temp.denied($$insert into public.race_results (athlete_race_goal_id, status, finish_time_sec, recorded_by) values ('d1420000-0000-4000-8000-000000000004', 'DNS', 10, 'd1400000-0000-4000-8000-000000000001')$$, 'DNS with time is rejected');
select lives_ok($$insert into public.race_results (athlete_race_goal_id, status, recorded_by) values ('d1420000-0000-4000-8000-000000000004', 'DNS', 'd1400000-0000-4000-8000-000000000001')$$, 'Valid DNS invariant is accepted');

select ok(not has_function_privilege('anon', 'public.create_race_result(uuid,text,integer,text)', 'execute'), 'Anonymous callers cannot execute create operation');
select ok(not has_function_privilege('anon', 'public.update_race_result(uuid,text,integer,text)', 'execute'), 'Anonymous callers cannot execute update operation');
select * from finish();
rollback;
