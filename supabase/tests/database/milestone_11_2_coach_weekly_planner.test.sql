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
  ('c2100000-0000-4000-8000-000000000001', 'm112-coach@example.test', '{"full_name":"M11.2 Coach"}'),
  ('c2100000-0000-4000-8000-000000000002', 'm112-athlete@example.test', '{"full_name":"M11.2 Athlete"}'),
  ('c2100000-0000-4000-8000-000000000003', 'm112-other@example.test', '{"full_name":"Other Coach"}'),
  ('c2100000-0000-4000-8000-000000000004', 'm112-admin@example.test', '{"full_name":"M11.2 Admin"}');
insert into public.user_roles (user_id, role_id)
select 'c2100000-0000-4000-8000-000000000001', id from public.roles where name='COACH';
insert into public.user_roles (user_id, role_id)
select 'c2100000-0000-4000-8000-000000000003', id from public.roles where name='COACH';
insert into public.user_roles (user_id, role_id)
select 'c2100000-0000-4000-8000-000000000004', id from public.roles where name='ADMIN';

insert into public.races (id, name, event_date, distance_m)
values ('c2200000-0000-4000-8000-000000000001', 'M11.2 Race', '2026-09-27', 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('c2300000-0000-4000-8000-000000000001', 'c2100000-0000-4000-8000-000000000002', 'c2200000-0000-4000-8000-000000000001', 14400, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by)
values ('c2400000-0000-4000-8000-000000000001', 'c2300000-0000-4000-8000-000000000001', 'Progressive Planner', '2026-09-09', '2026-09-27', 'c2100000-0000-4000-8000-000000000001');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date)
values ('c2500000-0000-4000-8000-000000000001', 'c2400000-0000-4000-8000-000000000001', 1, 'Imported', '2026-09-09', '2026-09-13');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title)
values ('c2600000-0000-4000-8000-000000000001', 'c2500000-0000-4000-8000-000000000001', 'EASY', '2026-09-10', 'Imported Easy');
insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m)
values ('c2600000-0000-4000-8000-000000000001', 1, 'EASY', 5000);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000001', true);
update public.training_programs set status='PUBLISHED' where id='c2400000-0000-4000-8000-000000000001';

select is((select count(*) from public.training_weeks where training_program_id='c2400000-0000-4000-8000-000000000001'), 1::bigint, 'viewing an UNPLANNED week creates no database row');

select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000002', true);
select pg_temp.denied($$ select public.start_training_week_plan('c2400000-0000-4000-8000-000000000001','2026-09-16') $$, 'Athlete cannot start weekly planning');
select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000003', true);
select pg_temp.denied($$ select public.start_training_week_plan('c2400000-0000-4000-8000-000000000001','2026-09-16') $$, 'unrelated Coach cannot plan another Coach program');

select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000001', true);
select ok(set_config('test.week_id', public.start_training_week_plan('c2400000-0000-4000-8000-000000000001','2026-09-16')::text, true) is not null, 'authorized Coach starts planning');
select is((select planning_status from public.training_weeks where id=current_setting('test.week_id')::uuid), 'DRAFT', 'start planning creates a DRAFT week');
select is((select start_date::text || '/' || end_date::text from public.training_weeks where id=current_setting('test.week_id')::uuid), '2026-09-14/2026-09-20', 'week dates are derived from the program calendar');
select is(public.start_training_week_plan('c2400000-0000-4000-8000-000000000001','2026-09-18'), current_setting('test.week_id')::uuid, 'duplicate start request is idempotent');
select is((select count(*) from public.training_weeks where training_program_id='c2400000-0000-4000-8000-000000000001' and week_number=2), 1::bigint, 'duplicate start creates exactly one week');
select pg_temp.denied($$ select public.start_training_week_plan('c2400000-0000-4000-8000-000000000001','2026-09-28') $$, 'week cannot exceed Program and Race boundary');

select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000002', true);
select pg_temp.denied(format(
  $$ select public.create_draft_week_prescription(%L,'EASY','2026-09-15','Athlete Write','', '[{"component_type":"EASY","target_distance_m":5000}]') $$,
  current_setting('test.week_id')
), 'Athlete cannot create a draft Prescription');

select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000001', true);
select pg_temp.denied(format(
  $$ select public.create_draft_week_prescription(%L,'EASY','2026-09-21','Outside Week','', '[{"component_type":"EASY","target_distance_m":5000}]') $$,
  current_setting('test.week_id')
), 'Prescription date must belong to its selected week');

select ok(set_config('test.prescription_id', public.create_draft_week_prescription(
  current_setting('test.week_id')::uuid,
  'SPEED', '2026-09-16', 'Intervals', 'Controlled repetitions',
  '[{"component_type":"EASY","target_distance_m":2000,"instruction":"Warm up"},{"component_type":"INTERVAL","repetitions":6,"distance_per_rep_m":400,"recovery_duration_sec":90}]'
)::text, true) is not null, 'Coach creates a Prescription with multiple components atomically');
select results_eq(
  format('select sequence_order from public.prescription_components where prescription_id=%L order by sequence_order', current_setting('test.prescription_id')),
  $$ values (1), (2) $$,
  'component ordering follows deterministic JSON array order'
);
select ok(set_config('test.second_id', public.create_draft_week_prescription(
  current_setting('test.week_id')::uuid,
  'STRENGTH', '2026-09-16', 'Strength', '',
  '[{"component_type":"STRENGTH","target_duration_sec":1800}]'
)::text, true) is not null, 'multiple sessions on the same day remain supported');
select is((select count(*) from public.training_prescriptions where training_week_id=current_setting('test.week_id')::uuid and scheduled_date='2026-09-16'), 2::bigint, 'same-day sessions are both stored');

select is(public.update_draft_week_prescription(
  current_setting('test.prescription_id')::uuid,
  'MEDIUM', '2026-09-17', 'Updated Medium', 'Updated details',
  '[{"component_type":"MEDIUM","target_distance_m":8000}]'
), current_setting('test.prescription_id')::uuid, 'Coach edits a DRAFT Prescription and its components');
select is((select title from public.training_prescriptions where id=current_setting('test.prescription_id')::uuid), 'Updated Medium', 'draft session fields are updated');
select is((select count(*) from public.prescription_components where prescription_id=current_setting('test.prescription_id')::uuid and target_distance_m=8000), 1::bigint, 'draft components are replaced atomically');

select is(public.delete_draft_week_prescription(current_setting('test.second_id')::uuid), current_setting('test.second_id')::uuid, 'Coach deletes a DRAFT Prescription');
select is(public.delete_draft_week_prescription(current_setting('test.prescription_id')::uuid), current_setting('test.prescription_id')::uuid, 'Coach can delete the final DRAFT Prescription');
select is((select planning_status from public.training_weeks where id=current_setting('test.week_id')::uuid), 'DRAFT', 'deleting the final session leaves the week DRAFT');
select pg_temp.denied(format($$ select public.publish_training_week(%L) $$, current_setting('test.week_id')), 'empty DRAFT week cannot be published');

select set_config('test.prescription_id', public.create_draft_week_prescription(
  current_setting('test.week_id')::uuid,
  'LONG', '2026-09-20', 'Long Run', '',
  '[{"component_type":"LONG","target_distance_m":16000}]'
)::text, true);
select is((select count(*) from public.get_authorized_program_claim_states(array['c2400000-0000-4000-8000-000000000001'::uuid]) where prescription_id=current_setting('test.prescription_id')::uuid), 0::bigint, 'DRAFT Prescription stays excluded from M10 input');
select is(public.publish_training_week(current_setting('test.week_id')::uuid), current_setting('test.week_id')::uuid, 'non-empty DRAFT week publishes atomically');
select is((select planning_status from public.training_weeks where id=current_setting('test.week_id')::uuid), 'PUBLISHED', 'published status is committed');
select is(public.publish_training_week(current_setting('test.week_id')::uuid), current_setting('test.week_id')::uuid, 'repeated publication is safely idempotent');
select pg_temp.denied(format(
  $$ select public.update_draft_week_prescription(%L,'LONG','2026-09-20','Rewrite','', '[{"component_type":"LONG","target_distance_m":18000}]') $$,
  current_setting('test.prescription_id')
), 'published Prescription cannot be edited through the planner');
select pg_temp.denied(format($$ select public.delete_draft_week_prescription(%L) $$, current_setting('test.prescription_id')), 'published Prescription cannot be deleted through the planner');
select is((select count(*) from public.get_authorized_program_claim_states(array['c2400000-0000-4000-8000-000000000001'::uuid]) where prescription_id=current_setting('test.prescription_id')::uuid), 1::bigint, 'published Prescription naturally enters M10 input');

select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.training_prescriptions where id=current_setting('test.prescription_id')::uuid), 1::bigint, 'Athlete sees the newly PUBLISHED Prescription');
select lives_ok(format(
  $$ insert into public.training_claims (athlete_id, prescription_id) values ('c2100000-0000-4000-8000-000000000002', %L) $$,
  current_setting('test.prescription_id')
), 'Athlete can use the existing Claim flow for a newly PUBLISHED Prescription');

reset role;
select set_config('request.jwt.claim.sub', '', true);
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by)
values ('c2400000-0000-4000-8000-000000000002', 'c2300000-0000-4000-8000-000000000001', 'Archive Test', '2026-09-09', '2026-09-13', 'c2100000-0000-4000-8000-000000000001');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date)
values ('c2500000-0000-4000-8000-000000000002', 'c2400000-0000-4000-8000-000000000002', 1, 'Build', '2026-09-09', '2026-09-13');
insert into public.training_prescriptions (training_week_id, training_menu, scheduled_date, title)
values ('c2500000-0000-4000-8000-000000000002', 'EASY', '2026-09-10', 'Archive Easy');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000001', true);
update public.training_programs set status='PUBLISHED' where id='c2400000-0000-4000-8000-000000000002';
update public.training_programs set status='ARCHIVED' where id='c2400000-0000-4000-8000-000000000002';
select pg_temp.denied($$ select public.start_training_week_plan('c2400000-0000-4000-8000-000000000002','2026-09-10') $$, 'ARCHIVED program cannot be planned');

select set_config('request.jwt.claim.sub', 'c2100000-0000-4000-8000-000000000004', true);
select lives_ok($$ select public.start_training_week_plan('c2400000-0000-4000-8000-000000000001','2026-09-25') $$, 'actual ADMIN retains authorized progressive-planning access');

select ok(not has_function_privilege('authenticated', 'public.can_manage_progressive_training_program(uuid)', 'execute'), 'internal authorization helper is not browser-callable');
select ok(not has_function_privilege('authenticated', 'public.insert_weekly_planner_components(uuid,jsonb)', 'execute'), 'internal component helper is not browser-callable');

reset role;
select * from finish();
rollback;
