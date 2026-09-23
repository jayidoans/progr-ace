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
  ('d1200000-0000-4000-8000-000000000001', 'm12-coach@example.test', '{"full_name":"M12 Coach"}'),
  ('d1200000-0000-4000-8000-000000000002', 'm12-other-coach@example.test', '{"full_name":"Other Coach"}'),
  ('d1200000-0000-4000-8000-000000000003', 'm12-admin@example.test', '{"full_name":"M12 Admin"}'),
  ('d1200000-0000-4000-8000-000000000004', 'm12-athlete-past@example.test', '{"full_name":"Past Athlete"}'),
  ('d1200000-0000-4000-8000-000000000005', 'm12-athlete-future@example.test', '{"full_name":"Future Athlete"}'),
  ('d1200000-0000-4000-8000-000000000006', 'm12-athlete-today@example.test', '{"full_name":"Today Athlete"}'),
  ('d1200000-0000-4000-8000-000000000007', 'm12-athlete-other@example.test', '{"full_name":"Other Athlete"}'),
  ('d1200000-0000-4000-8000-000000000008', 'm12-athlete-admin@example.test', '{"full_name":"Admin Athlete"}'),
  ('d1200000-0000-4000-8000-000000000009', 'm12-dual@example.test', '{"full_name":"Dual Role User"}'),
  ('d1200000-0000-4000-8000-000000000010', 'm12-cancelled@example.test', '{"full_name":"Cancelled Athlete"}');

insert into public.user_roles (user_id, role_id)
select user_id, role.id
from (values
  ('d1200000-0000-4000-8000-000000000001'::uuid, 'COACH'),
  ('d1200000-0000-4000-8000-000000000002'::uuid, 'COACH'),
  ('d1200000-0000-4000-8000-000000000003'::uuid, 'ADMIN'),
  ('d1200000-0000-4000-8000-000000000009'::uuid, 'COACH')
) assignment(user_id, role_name)
join public.roles role on role.name = assignment.role_name
on conflict do nothing;

insert into public.races (id, name, event_date, distance_m) values
  ('d1210000-0000-4000-8000-000000000001', 'Past Race', current_date - 1, 10000),
  ('d1210000-0000-4000-8000-000000000002', 'Future Race', current_date + 60, 21097),
  ('d1210000-0000-4000-8000-000000000003', 'Today Race', current_date, 5000),
  ('d1210000-0000-4000-8000-000000000004', 'Other Coach Race', current_date, 10000),
  ('d1210000-0000-4000-8000-000000000005', 'Admin Race', current_date, 42195),
  ('d1210000-0000-4000-8000-000000000006', 'Self-Coached Race', current_date, 5000),
  ('d1210000-0000-4000-8000-000000000007', 'Cancelled Race', current_date + 30, 10000);

insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status) values
  ('d1220000-0000-4000-8000-000000000001', 'd1200000-0000-4000-8000-000000000004', 'd1210000-0000-4000-8000-000000000001', 3600, 'ACTIVE'),
  ('d1220000-0000-4000-8000-000000000002', 'd1200000-0000-4000-8000-000000000005', 'd1210000-0000-4000-8000-000000000002', 7200, 'ACTIVE'),
  ('d1220000-0000-4000-8000-000000000003', 'd1200000-0000-4000-8000-000000000006', 'd1210000-0000-4000-8000-000000000003', 1800, 'ACTIVE'),
  ('d1220000-0000-4000-8000-000000000004', 'd1200000-0000-4000-8000-000000000007', 'd1210000-0000-4000-8000-000000000004', 3600, 'ACTIVE'),
  ('d1220000-0000-4000-8000-000000000005', 'd1200000-0000-4000-8000-000000000008', 'd1210000-0000-4000-8000-000000000005', 14400, 'ACTIVE'),
  ('d1220000-0000-4000-8000-000000000006', 'd1200000-0000-4000-8000-000000000009', 'd1210000-0000-4000-8000-000000000006', 1800, 'ACTIVE'),
  ('d1220000-0000-4000-8000-000000000007', 'd1200000-0000-4000-8000-000000000010', 'd1210000-0000-4000-8000-000000000007', 3600, 'CANCELLED');

insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by) values
  ('d1230000-0000-4000-8000-000000000001', 'd1220000-0000-4000-8000-000000000001', 'Past Program', current_date - 1, current_date - 1, 'd1200000-0000-4000-8000-000000000001'),
  ('d1230000-0000-4000-8000-000000000002', 'd1220000-0000-4000-8000-000000000002', 'Future Program', current_date, current_date + 30, 'd1200000-0000-4000-8000-000000000001'),
  ('d1230000-0000-4000-8000-000000000003', 'd1220000-0000-4000-8000-000000000003', 'Today Program', current_date, current_date, 'd1200000-0000-4000-8000-000000000001'),
  ('d1230000-0000-4000-8000-000000000004', 'd1220000-0000-4000-8000-000000000004', 'Other Coach Program', current_date, current_date, 'd1200000-0000-4000-8000-000000000002'),
  ('d1230000-0000-4000-8000-000000000006', 'd1220000-0000-4000-8000-000000000006', 'Self Program', current_date, current_date, 'd1200000-0000-4000-8000-000000000009');

insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date) values
  ('d1240000-0000-4000-8000-000000000001', 'd1230000-0000-4000-8000-000000000001', 1, 'Race', current_date - 1, current_date - 1),
  ('d1240000-0000-4000-8000-000000000002', 'd1230000-0000-4000-8000-000000000002', 1, 'Build', current_date, date_trunc('week', current_date::timestamp)::date + 6),
  ('d1240000-0000-4000-8000-000000000003', 'd1230000-0000-4000-8000-000000000003', 1, 'Race', current_date, current_date),
  ('d1240000-0000-4000-8000-000000000004', 'd1230000-0000-4000-8000-000000000004', 1, 'Race', current_date, current_date),
  ('d1240000-0000-4000-8000-000000000006', 'd1230000-0000-4000-8000-000000000006', 1, 'Race', current_date, current_date);

insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title) values
  ('d1250000-0000-4000-8000-000000000001', 'd1240000-0000-4000-8000-000000000001', 'EASY', current_date - 1, 'Historical Run'),
  ('d1250000-0000-4000-8000-000000000002', 'd1240000-0000-4000-8000-000000000002', 'EASY', current_date, 'Current Run'),
  ('d1250000-0000-4000-8000-000000000003', 'd1240000-0000-4000-8000-000000000003', 'EASY', current_date, 'Race Day Run'),
  ('d1250000-0000-4000-8000-000000000004', 'd1240000-0000-4000-8000-000000000004', 'EASY', current_date, 'Other Run'),
  ('d1250000-0000-4000-8000-000000000006', 'd1240000-0000-4000-8000-000000000006', 'EASY', current_date, 'Self Run');

update public.training_programs set status = 'PUBLISHED';

insert into public.activities (id, athlete_id, name, sport_type, started_at, distance_m, duration_sec, source)
values ('d1260000-0000-4000-8000-000000000001', 'd1200000-0000-4000-8000-000000000004', 'Historical Activity', 'RUNNING', current_date - 1, 5000, 1800, 'MANUAL');
insert into public.training_claims (id, athlete_id, prescription_id, status)
values ('d1270000-0000-4000-8000-000000000001', 'd1200000-0000-4000-8000-000000000004', 'd1250000-0000-4000-8000-000000000001', 'DRAFT');
insert into public.claim_activities (claim_id, activity_id)
values ('d1270000-0000-4000-8000-000000000001', 'd1260000-0000-4000-8000-000000000001');
update public.training_claims set status = 'SUBMITTED', submitted_at = now()
where id = 'd1270000-0000-4000-8000-000000000001';

insert into public.strava_access_permissions (user_id, allowed, granted_at)
values ('d1200000-0000-4000-8000-000000000004', true, now());
insert into public.strava_connections (
  athlete_id, strava_athlete_id, granted_scopes, connection_status,
  access_token_ciphertext, access_token_iv, refresh_token_ciphertext,
  refresh_token_iv, access_token_expires_at
) values (
  'd1200000-0000-4000-8000-000000000004', 120001, array['read','activity:read_all'], 'CONNECTED',
  'ciphertext', 'iv', 'refresh-ciphertext', 'refresh-iv', now() + interval '1 hour'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1200000-0000-4000-8000-000000000004', true);
select pg_temp.denied($$ update public.athlete_race_goals set status='COMPLETED' where id='d1220000-0000-4000-8000-000000000001' $$, 'Athlete cannot complete their own goal by direct table update');
select pg_temp.denied($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000001') $$, 'Athlete cannot bypass completion through the RPC');

select set_config('request.jwt.claim.sub', 'd1200000-0000-4000-8000-000000000001', true);
select pg_temp.denied($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000002') $$, 'Coach cannot complete a Race Goal before Race Date');
select pg_temp.denied($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000004') $$, 'Coach cannot complete another Coach Race Goal');
select lives_ok($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000001') $$, 'authorized Coach completes an ACTIVE goal after Race Date');
select is((select status from public.athlete_race_goals where id='d1220000-0000-4000-8000-000000000001'), 'COMPLETED', 'completed goal remains COMPLETED');
select ok((select completed_at is not null and completed_by='d1200000-0000-4000-8000-000000000001' from public.athlete_race_goals where id='d1220000-0000-4000-8000-000000000001'), 'completion audit is server-generated for the authenticated Coach');
select pg_temp.denied($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000001') $$, 'repeated completion fails safely');
select lives_ok($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000003') $$, 'authorized Coach completes an ACTIVE goal on Race Date');

select set_config('request.jwt.claim.sub', 'd1200000-0000-4000-8000-000000000009', true);
select pg_temp.denied($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000006') $$, 'dual-role Coach cannot complete their own Race Goal');

select set_config('request.jwt.claim.sub', 'd1200000-0000-4000-8000-000000000003', true);
select lives_ok($$ select public.complete_coached_race_goal('d1220000-0000-4000-8000-000000000005') $$, 'ADMIN retains appropriate completion access');

reset role;
select is((select status from public.training_programs where id='d1230000-0000-4000-8000-000000000001'), 'PUBLISHED', 'completion does not archive the Training Program');
select is((select count(*) from public.training_weeks where training_program_id='d1230000-0000-4000-8000-000000000001'), 1::bigint, 'completion preserves Training Weeks');
select is((select count(*) from public.training_prescriptions where training_week_id='d1240000-0000-4000-8000-000000000001'), 1::bigint, 'completion preserves Prescriptions');
select is((select count(*) from public.activities where id='d1260000-0000-4000-8000-000000000001'), 1::bigint, 'completion preserves Activities');
select is((select count(*) from public.training_claims where id='d1270000-0000-4000-8000-000000000001'), 1::bigint, 'completion preserves Claims');
select is((select count(*) from public.claim_validations where claim_id='d1270000-0000-4000-8000-000000000001'), 1::bigint, 'completion preserves Validations and historical M10 input');
select is((select connection_status from public.strava_connections where athlete_id='d1200000-0000-4000-8000-000000000004'), 'CONNECTED', 'completion does not disconnect Strava');

select pg_temp.denied($$ insert into public.training_programs (race_goal_id,name,start_date,end_date,created_by) values ('d1220000-0000-4000-8000-000000000001','Completed Goal Program',current_date-1,current_date-1,'d1200000-0000-4000-8000-000000000001') $$, 'COMPLETED Race Goal cannot create a new Training Program');
select pg_temp.denied($$ insert into public.training_programs (race_goal_id,name,start_date,end_date,created_by) values ('d1220000-0000-4000-8000-000000000007','Cancelled Goal Program',current_date,current_date+1,'d1200000-0000-4000-8000-000000000001') $$, 'CANCELLED Race Goal cannot create a new Training Program');
select lives_ok($$ insert into public.training_programs (race_goal_id,name,start_date,end_date,created_by) values ('d1220000-0000-4000-8000-000000000002','Active Goal Program',current_date,current_date+7,'d1200000-0000-4000-8000-000000000001') $$, 'ACTIVE eligible Race Goal can still create a Training Program');

select is((select count(*) from public.training_programs where created_by='d1200000-0000-4000-8000-000000000001' and race_goal_id='d1220000-0000-4000-8000-000000000004'), 0::bigint, 'Coach ownership scope excludes another Coach Athlete');
select is((select count(*) from public.training_programs where created_by='d1200000-0000-4000-8000-000000000001' and race_goal_id in ('d1220000-0000-4000-8000-000000000001','d1220000-0000-4000-8000-000000000002','d1220000-0000-4000-8000-000000000003')), 4::bigint, 'Coach ownership scope contains only their related Athlete programs');

select ok(not has_function_privilege('anon', 'public.complete_coached_race_goal(uuid)', 'execute'), 'anonymous callers cannot execute completion');
select ok(not has_function_privilege('authenticated', 'public.require_active_training_program_goal()', 'execute'), 'training-program eligibility helper is not browser-callable');

select * from finish();
rollback;
