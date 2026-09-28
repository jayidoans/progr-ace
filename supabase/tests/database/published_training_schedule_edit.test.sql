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
  ('e1100000-0000-4000-8000-000000000001', 'published-edit-coach@example.test', '{"full_name":"Owning Coach"}'),
  ('e1100000-0000-4000-8000-000000000002', 'published-edit-athlete@example.test', '{"full_name":"Selected Athlete"}'),
  ('e1100000-0000-4000-8000-000000000003', 'published-edit-other@example.test', '{"full_name":"Other Coach"}'),
  ('e1100000-0000-4000-8000-000000000004', 'published-edit-admin@example.test', '{"full_name":"Schedule Admin"}');
insert into public.user_roles (user_id, role_id)
select 'e1100000-0000-4000-8000-000000000001', id from public.roles where name='COACH';
insert into public.user_roles (user_id, role_id)
select 'e1100000-0000-4000-8000-000000000003', id from public.roles where name='COACH';
insert into public.user_roles (user_id, role_id)
select 'e1100000-0000-4000-8000-000000000004', id from public.roles where name='ADMIN';

insert into public.races (id, name, event_date, distance_m)
values ('e1200000-0000-4000-8000-000000000001', 'Published Edit Race', current_date + 90, 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('e1300000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000002', 'e1200000-0000-4000-8000-000000000001', 14400, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by, status)
values (
  'e1400000-0000-4000-8000-000000000001',
  'e1300000-0000-4000-8000-000000000001',
  'Selected Athlete Program',
  (date_trunc('week', current_date)::date - 7),
  (date_trunc('week', current_date)::date + 20),
  'e1100000-0000-4000-8000-000000000001',
  'PUBLISHED'
);
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status) values
  ('e1500000-0000-4000-8000-000000000001', 'e1400000-0000-4000-8000-000000000001', 1, 'Past', date_trunc('week', current_date)::date - 7, date_trunc('week', current_date)::date - 1, 'PUBLISHED'),
  ('e1500000-0000-4000-8000-000000000002', 'e1400000-0000-4000-8000-000000000001', 2, 'Current', date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6, 'PUBLISHED'),
  ('e1500000-0000-4000-8000-000000000003', 'e1400000-0000-4000-8000-000000000001', 3, 'Future', date_trunc('week', current_date)::date + 7, date_trunc('week', current_date)::date + 13, 'PUBLISHED'),
  ('e1500000-0000-4000-8000-000000000004', 'e1400000-0000-4000-8000-000000000001', 4, 'Draft', date_trunc('week', current_date)::date + 14, date_trunc('week', current_date)::date + 20, 'DRAFT');

insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title) values
  ('e1600000-0000-4000-8000-000000000001', 'e1500000-0000-4000-8000-000000000001', 'EASY', date_trunc('week', current_date)::date - 3, 'Past Session'),
  ('e1600000-0000-4000-8000-000000000002', 'e1500000-0000-4000-8000-000000000002', 'EASY', current_date, 'Editable Session'),
  ('e1600000-0000-4000-8000-000000000003', 'e1500000-0000-4000-8000-000000000002', 'MEDIUM', current_date, 'Draft Claimed Session'),
  ('e1600000-0000-4000-8000-000000000004', 'e1500000-0000-4000-8000-000000000002', 'LONG', current_date, 'Submitted Claimed Session');
insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m) values
  ('e1600000-0000-4000-8000-000000000001', 1, 'EASY', 3000),
  ('e1600000-0000-4000-8000-000000000002', 1, 'EASY', 5000),
  ('e1600000-0000-4000-8000-000000000003', 1, 'MEDIUM', 8000),
  ('e1600000-0000-4000-8000-000000000004', 1, 'LONG', 16000);
insert into public.training_claims (id, athlete_id, prescription_id, status, submitted_at) values
  ('e1700000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000002', 'e1600000-0000-4000-8000-000000000003', 'DRAFT', null),
  ('e1700000-0000-4000-8000-000000000002', 'e1100000-0000-4000-8000-000000000002', 'e1600000-0000-4000-8000-000000000004', 'SUBMITTED', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000002', 'EASY', current_date, 'Anonymous', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'unauthenticated caller cannot edit a published schedule');

select set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000002', true);
select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000002', 'EASY', current_date, 'Athlete Write', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'Athlete cannot edit their published schedule');

select set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000003', true);
select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000002', 'EASY', current_date, 'Other Coach Write', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'unrelated Coach cannot edit the selected Athlete program');

select set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000001', true);
select ok(set_config('test.new_prescription', public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000002', 'SPEED', current_date, 'Added Today', 'Safe revision',
  '[{"component_type":"EASY","target_distance_m":2000},{"component_type":"INTERVAL","repetitions":6,"distance_per_rep_m":400}]'
)::text, true) is not null, 'owning Coach adds a session to the selected Athlete current week');
select results_eq(
  format('select sequence_order from public.prescription_components where prescription_id=%L order by sequence_order', current_setting('test.new_prescription')),
  $$ values (1), (2) $$,
  'new published-session components retain deterministic order'
);
select is(public.update_published_week_prescription(
  'e1600000-0000-4000-8000-000000000002', 'MEDIUM', current_date, 'Updated Current Session', 'Adjusted safely',
  '[{"component_type":"MEDIUM","target_distance_m":9000}]'
), 'e1600000-0000-4000-8000-000000000002'::uuid, 'owning Coach updates an unclaimed current session');
select is((select title from public.training_prescriptions where id='e1600000-0000-4000-8000-000000000002'), 'Updated Current Session', 'published session fields are updated');
select is((select count(*) from public.prescription_components where prescription_id='e1600000-0000-4000-8000-000000000002' and target_distance_m=9000), 1::bigint, 'published session components are replaced atomically');

select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000001', 'EASY', date_trunc('week', current_date)::date - 3, 'Past Week', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'past published week cannot be edited');
select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000002', 'EASY', current_date - 1, 'Past Date', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'a new session cannot be scheduled before today');
select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000002', 'EASY', date_trunc('week', current_date)::date + 7, 'Outside Week', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'a new session date must remain inside the selected week');
select pg_temp.denied($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000004', 'EASY', date_trunc('week', current_date)::date + 14, 'Draft Week', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'published revision path cannot mutate a DRAFT week');
select pg_temp.denied($$ select public.update_published_week_prescription(
  'e1600000-0000-4000-8000-000000000001', 'EASY', date_trunc('week', current_date)::date - 3, 'Past Rewrite', '',
  '[{"component_type":"EASY","target_distance_m":5000}]'
) $$, 'past session cannot be updated');
select pg_temp.denied($$ select public.update_published_week_prescription(
  'e1600000-0000-4000-8000-000000000003', 'MEDIUM', current_date, 'Draft Claim Rewrite', '',
  '[{"component_type":"MEDIUM","target_distance_m":9000}]'
) $$, 'session with a DRAFT Claim is immutable');
select pg_temp.denied($$ select public.update_published_week_prescription(
  'e1600000-0000-4000-8000-000000000004', 'LONG', current_date, 'Submitted Claim Rewrite', '',
  '[{"component_type":"LONG","target_distance_m":18000}]'
) $$, 'session with a SUBMITTED Claim is immutable');

select set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000004', true);
select lives_ok($$ select public.create_published_week_prescription(
  'e1500000-0000-4000-8000-000000000003', 'LONG', date_trunc('week', current_date)::date + 7, 'Admin Future Session', '',
  '[{"component_type":"LONG","target_distance_m":18000}]'
) $$, 'actual ADMIN retains appropriate published schedule access');

reset role;
select is((select end_date from public.training_programs where id='e1400000-0000-4000-8000-000000000001'), date_trunc('week', current_date)::date + 20, 'schedule edits do not change Program end date');
select is((select count(*) from public.training_claims where id in ('e1700000-0000-4000-8000-000000000001','e1700000-0000-4000-8000-000000000002')), 2::bigint, 'existing Claims remain unchanged');
select ok(not has_function_privilege('authenticated', 'public.can_revise_published_training_week(uuid)', 'execute'), 'internal authorization helper is not browser-callable');

select * from finish();
rollback;
