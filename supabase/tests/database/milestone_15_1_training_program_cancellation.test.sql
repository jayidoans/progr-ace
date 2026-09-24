begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.throws_any_ok(p_sql text, p_description text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when others then
  return extensions.ok(true, p_description);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('f1510000-0000-4000-8000-000000000001', 'cancel-athlete@example.test', '{"full_name":"Cancel Athlete"}'),
  ('f1510000-0000-4000-8000-000000000002', 'other-athlete@example.test', '{"full_name":"Other Athlete"}'),
  ('f1510000-0000-4000-8000-000000000003', 'cancel-coach@example.test', '{"full_name":"Cancel Coach"}'),
  ('f1510000-0000-4000-8000-000000000004', 'other-coach@example.test', '{"full_name":"Other Coach"}'),
  ('f1510000-0000-4000-8000-000000000005', 'cancel-admin@example.test', '{"full_name":"Cancel Admin"}');

insert into public.user_roles (user_id, role_id)
select actor, roles.id from (values
  ('f1510000-0000-4000-8000-000000000003'::uuid, 'COACH'),
  ('f1510000-0000-4000-8000-000000000004'::uuid, 'COACH'),
  ('f1510000-0000-4000-8000-000000000005'::uuid, 'ADMIN')
) assignments(actor, role_name)
join public.roles on roles.name = assignments.role_name;

insert into public.races (id, name, event_date, distance_m) values
  ('f1511000-0000-4000-8000-000000000001', 'Cancellation Race', '2026-12-06', 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status) values
  ('f1512000-0000-4000-8000-000000000001', 'f1510000-0000-4000-8000-000000000001', 'f1511000-0000-4000-8000-000000000001', 15000, 'ACTIVE'),
  ('f1512000-0000-4000-8000-000000000002', 'f1510000-0000-4000-8000-000000000002', 'f1511000-0000-4000-8000-000000000001', 16000, 'ACTIVE');

insert into public.training_programs (
  id, race_goal_id, name, start_date, end_date, tracking_start_date, created_by, status,
  cancelled_at, cancelled_by, cancellation_reason
) values
  ('f1513000-0000-4000-8000-000000000001', 'f1512000-0000-4000-8000-000000000001', 'Approve', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'PUBLISHED', null, null, null),
  ('f1513000-0000-4000-8000-000000000002', 'f1512000-0000-4000-8000-000000000001', 'Decline', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'PUBLISHED', null, null, null),
  ('f1513000-0000-4000-8000-000000000003', 'f1512000-0000-4000-8000-000000000001', 'Direct', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'PUBLISHED', null, null, null),
  ('f1513000-0000-4000-8000-000000000004', 'f1512000-0000-4000-8000-000000000001', 'Pending direct', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'PUBLISHED', null, null, null),
  ('f1513000-0000-4000-8000-000000000005', 'f1512000-0000-4000-8000-000000000001', 'Own draft', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'DRAFT', null, null, null),
  ('f1513000-0000-4000-8000-000000000006', 'f1512000-0000-4000-8000-000000000002', 'Other draft', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000004', 'DRAFT', null, null, null),
  ('f1513000-0000-4000-8000-000000000007', 'f1512000-0000-4000-8000-000000000001', 'Published delete', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'PUBLISHED', null, null, null),
  ('f1513000-0000-4000-8000-000000000008', 'f1512000-0000-4000-8000-000000000001', 'Archived', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'ARCHIVED', null, null, null),
  ('f1513000-0000-4000-8000-000000000009', 'f1512000-0000-4000-8000-000000000001', 'Athlete cannot delete', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000003', 'DRAFT', null, null, null),
  ('f1513000-0000-4000-8000-000000000010', 'f1512000-0000-4000-8000-000000000002', 'Admin direct', '2026-09-21', '2026-12-06', '2026-09-21', 'f1510000-0000-4000-8000-000000000004', 'PUBLISHED', null, null, null);

insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status) values
  ('f1514000-0000-4000-8000-000000000003', 'f1513000-0000-4000-8000-000000000003', 1, 'Build', '2026-09-21', '2026-09-27', 'PUBLISHED'),
  ('f1514000-0000-4000-8000-000000000005', 'f1513000-0000-4000-8000-000000000005', 1, 'Build', '2026-09-21', '2026-09-27', 'DRAFT');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title) values
  ('f1515000-0000-4000-8000-000000000001', 'f1514000-0000-4000-8000-000000000003', 'EASY', '2026-09-23', 'Historical'),
  ('f1515000-0000-4000-8000-000000000002', 'f1514000-0000-4000-8000-000000000003', 'EASY', '2026-09-24', 'Cancellation date'),
  ('f1515000-0000-4000-8000-000000000003', 'f1514000-0000-4000-8000-000000000005', 'EASY', '2026-09-23', 'Draft child');
insert into public.prescription_components (id, prescription_id, sequence_order, component_type, target_distance_m) values
  ('f1516000-0000-4000-8000-000000000001', 'f1515000-0000-4000-8000-000000000001', 1, 'EASY', 5000),
  ('f1516000-0000-4000-8000-000000000002', 'f1515000-0000-4000-8000-000000000002', 1, 'EASY', 5000),
  ('f1516000-0000-4000-8000-000000000003', 'f1515000-0000-4000-8000-000000000003', 1, 'EASY', 5000);
insert into public.training_claims (id, athlete_id, prescription_id, status) values
  ('f1517000-0000-4000-8000-000000000001', 'f1510000-0000-4000-8000-000000000001', 'f1515000-0000-4000-8000-000000000002', 'DRAFT');
insert into public.training_import_previews (
  id, created_by, race_goal_id, source_hash, template_version, payload, imported_program_id
) values (
  'f1518000-0000-4000-8000-000000000001', 'f1510000-0000-4000-8000-000000000003',
  'f1512000-0000-4000-8000-000000000001', repeat('a', 64), 1, '{}'::jsonb,
  'f1513000-0000-4000-8000-000000000005'
);

select lives_ok($$insert into public.training_programs (
  id, race_goal_id, name, start_date, end_date, created_by, status, cancelled_at, cancelled_by, cancellation_reason
) values (
  'f1513000-0000-4000-8000-000000000011', 'f1512000-0000-4000-8000-000000000001',
  'Valid cancelled', '2026-09-21', '2026-12-06', 'f1510000-0000-4000-8000-000000000003',
  'CANCELLED', now(), 'f1510000-0000-4000-8000-000000000003', 'Valid reason'
)$$, 'CANCELLED is a valid audited Program status');
select * from pg_temp.throws_any_ok($$insert into public.training_programs (
  id, race_goal_id, name, start_date, end_date, created_by, status
) values (
  'f1513000-0000-4000-8000-000000000012', 'f1512000-0000-4000-8000-000000000001',
  'Invalid cancelled', '2026-09-21', '2026-12-06', 'f1510000-0000-4000-8000-000000000003', 'CANCELLED'
)$$, 'CANCELLED requires complete audit data');
select results_eq(
  $$select distinct status from public.training_programs where id::text like 'f1513000%' order by status$$,
  $$values ('ARCHIVED'::text), ('CANCELLED'::text), ('DRAFT'::text), ('PUBLISHED'::text)$$,
  'all four Program lifecycle statuses remain valid'
);

set local role anon;
select * from pg_temp.throws_any_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000001', 'anonymous'
)$$, 'unauthenticated caller cannot request cancellation');
select * from pg_temp.throws_any_ok($$select public.cancel_training_program(
  'f1513000-0000-4000-8000-000000000003', 'anonymous'
)$$, 'unauthenticated caller cannot cancel Program');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000001', '  Athlete reason  '
)$$, 'Athlete can request cancellation of own published Program');
select is((select status from public.training_programs where id = 'f1513000-0000-4000-8000-000000000001'), 'PUBLISHED', 'pending request leaves Program published');
select is((select request_reason from public.training_program_cancellation_requests where training_program_id = 'f1513000-0000-4000-8000-000000000001'), 'Athlete reason', 'request reason is normalized and retained');
select * from pg_temp.throws_any_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000001', 'duplicate'
)$$, 'duplicate pending request is rejected');
select * from pg_temp.throws_any_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000002', '   '
)$$, 'whitespace-only request reason is rejected');
select * from pg_temp.throws_any_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000006', 'not mine'
)$$, 'Athlete cannot request cancellation for another Athlete Program');
select * from pg_temp.throws_any_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000009', 'draft'
)$$, 'DRAFT Program cancellation request is rejected');
select * from pg_temp.throws_any_ok($$select public.delete_draft_training_program(
  'f1513000-0000-4000-8000-000000000009'
)$$, 'Athlete cannot delete a DRAFT Program');
select * from pg_temp.throws_any_ok($$insert into public.training_program_cancellation_requests (
  training_program_id, requested_by, request_reason
) values (
  'f1513000-0000-4000-8000-000000000007', 'f1510000-0000-4000-8000-000000000001', 'bypass'
)$$, 'client cannot bypass request RPC with a direct table insert');

select public.request_training_program_cancellation('f1513000-0000-4000-8000-000000000002', 'Please stop');
select public.request_training_program_cancellation('f1513000-0000-4000-8000-000000000004', 'Pending edge');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000004', true);
select * from pg_temp.throws_any_ok(format(
  'select public.review_training_program_cancellation(%L, %L, null)',
  (select id from public.training_program_cancellation_requests where training_program_id = 'f1513000-0000-4000-8000-000000000001'),
  'APPROVED'
), 'unrelated Coach cannot approve request');
select * from pg_temp.throws_any_ok($$select public.cancel_training_program(
  'f1513000-0000-4000-8000-000000000003', 'not owned'
)$$, 'unrelated Coach cannot directly cancel');
select * from pg_temp.throws_any_ok($$select public.delete_draft_training_program(
  'f1513000-0000-4000-8000-000000000005'
)$$, 'unrelated Coach cannot delete another Coach draft');
select is((select count(*) from public.training_programs where created_by = 'f1510000-0000-4000-8000-000000000003'), 0::bigint, 'unrelated Coach cannot read another Coach Programs');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000003', true);
select lives_ok(format(
  'select public.review_training_program_cancellation(%L, %L, %L)',
  (select id from public.training_program_cancellation_requests where training_program_id = 'f1513000-0000-4000-8000-000000000001'),
  'APPROVED', 'Reviewed'
), 'owning Coach can approve request');
select is((select status from public.training_programs where id = 'f1513000-0000-4000-8000-000000000001'), 'CANCELLED', 'approval cancels Program atomically');
select is((select cancellation_reason from public.training_programs where id = 'f1513000-0000-4000-8000-000000000001'), 'Athlete reason', 'approved request reason becomes final cancellation reason');
select ok((select cancelled_by = 'f1510000-0000-4000-8000-000000000003' and cancelled_at is not null from public.training_programs where id = 'f1513000-0000-4000-8000-000000000001'), 'approval audit records authenticated Coach');
select is((select status from public.training_program_cancellation_requests where training_program_id = 'f1513000-0000-4000-8000-000000000001'), 'APPROVED', 'request is approved');

select lives_ok(format(
  'select public.review_training_program_cancellation(%L, %L, %L)',
  (select id from public.training_program_cancellation_requests where training_program_id = 'f1513000-0000-4000-8000-000000000002'),
  'DECLINED', 'Continue training'
), 'owning Coach can decline request');
select is((select status from public.training_programs where id = 'f1513000-0000-4000-8000-000000000002'), 'PUBLISHED', 'decline leaves Program published');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.training_programs where id = 'f1513000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete retains read access to own CANCELLED Program');
select is((select count(*) from public.training_program_cancellation_requests where training_program_id = 'f1513000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete can read own cancellation history');
select lives_ok($$select public.request_training_program_cancellation(
  'f1513000-0000-4000-8000-000000000002', 'Ask again'
)$$, 'Athlete may request again after decline');
select * from pg_temp.throws_any_ok($$select public.cancel_training_program(
  'f1513000-0000-4000-8000-000000000003', 'athlete direct attempt'
)$$, 'Athlete cannot directly cancel Program');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000003', true);
select lives_ok($$select public.cancel_training_program(
  'f1513000-0000-4000-8000-000000000003', '  Coach direct reason  '
)$$, 'owning Coach can directly cancel published Program');
select * from pg_temp.throws_any_ok($$delete from public.training_programs
  where id = 'f1513000-0000-4000-8000-000000000009'
$$, 'direct client Program deletion is revoked');
select is((select cancellation_reason from public.training_programs where id = 'f1513000-0000-4000-8000-000000000003'), 'Coach direct reason', 'direct reason is normalized and audited');
select * from pg_temp.throws_any_ok($$select public.cancel_training_program(
  'f1513000-0000-4000-8000-000000000004', 'different direct reason'
)$$, 'direct cancellation is rejected while Athlete request is pending');
select is((select status from public.training_programs where id = 'f1513000-0000-4000-8000-000000000004'), 'PUBLISHED', 'pending edge leaves Program and request truthful');

reset role;
select is((select count(*) from public.training_claims where id = 'f1517000-0000-4000-8000-000000000001'), 1::bigint, 'existing DRAFT Claim is preserved after cancellation');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000001', true);
select * from pg_temp.throws_any_ok($$select public.submit_training_claim(
  'f1517000-0000-4000-8000-000000000001'
)$$, 'DRAFT Claim cannot be submitted after Program cancellation');
select * from pg_temp.throws_any_ok($$insert into public.training_claims (
  athlete_id, prescription_id
) values (
  'f1510000-0000-4000-8000-000000000001', 'f1515000-0000-4000-8000-000000000001'
)$$, 'new Claim cannot be created after Program cancellation');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000003', true);
select * from pg_temp.throws_any_ok($$select public.start_training_week_plan(
  'f1513000-0000-4000-8000-000000000003', '2026-09-28', 'Build'
)$$, 'new weekly planning is blocked for CANCELLED Program');
select is((select count(*) from public.training_weeks where training_program_id = 'f1513000-0000-4000-8000-000000000003'), 1::bigint, 'historical Weeks remain after cancellation');
select is((select status from public.athlete_race_goals where id = 'f1512000-0000-4000-8000-000000000001'), 'ACTIVE', 'Race Goal remains unchanged');

select lives_ok($$select public.delete_draft_training_program(
  'f1513000-0000-4000-8000-000000000005'
)$$, 'owning Coach can permanently delete own DRAFT Program');
select is((select count(*) from public.training_programs where id = 'f1513000-0000-4000-8000-000000000005'), 0::bigint, 'DRAFT Program is deleted');
select is((select count(*) from public.training_weeks where id = 'f1514000-0000-4000-8000-000000000005'), 0::bigint, 'DRAFT Week cascades on deletion');
select is((select imported_program_id from public.training_import_previews where id = 'f1518000-0000-4000-8000-000000000001'), null, 'import preview link is safely cleared');
select * from pg_temp.throws_any_ok($$select public.delete_draft_training_program(
  'f1513000-0000-4000-8000-000000000007'
)$$, 'PUBLISHED Program cannot be deleted');
select * from pg_temp.throws_any_ok($$select public.delete_draft_training_program(
  'f1513000-0000-4000-8000-000000000003'
)$$, 'CANCELLED Program cannot be deleted');
select * from pg_temp.throws_any_ok($$select public.delete_draft_training_program(
  'f1513000-0000-4000-8000-000000000008'
)$$, 'ARCHIVED Program cannot be deleted');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000005', true);
select lives_ok($$select public.cancel_training_program(
  'f1513000-0000-4000-8000-000000000010', 'Admin decision'
)$$, 'Admin retains broader cancellation authority');
select ok((select count(*) >= 4 from public.training_program_cancellation_requests), 'Admin can read cancellation history across authorized Programs');

select set_config('request.jwt.claim.sub', 'f1510000-0000-4000-8000-000000000003', true);
select set_config('test.copy_id', public.copy_training_program(
  'f1513000-0000-4000-8000-000000000003', 'f1512000-0000-4000-8000-000000000001'
)::text, true);
select is((select status from public.training_programs where id = current_setting('test.copy_id')::uuid), 'DRAFT', 'copy of CANCELLED source remains DRAFT');
select ok((select cancelled_at is null and cancelled_by is null and cancellation_reason is null from public.training_programs where id = current_setting('test.copy_id')::uuid), 'Program copy omits cancellation audit state');
select is((select count(*) from public.training_program_cancellation_requests where training_program_id = current_setting('test.copy_id')::uuid), 0::bigint, 'Program copy omits cancellation request history');

reset role;
select * from finish();
rollback;
