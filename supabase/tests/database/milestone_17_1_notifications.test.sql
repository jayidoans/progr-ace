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
  ('f1710000-0000-4000-8000-000000000001', 'notification-athlete-a@example.test', '{"full_name":"Athlete A"}'),
  ('f1710000-0000-4000-8000-000000000002', 'notification-athlete-b@example.test', '{"full_name":"Athlete B"}'),
  ('f1710000-0000-4000-8000-000000000003', 'notification-coach-a@example.test', '{"full_name":"Coach A"}'),
  ('f1710000-0000-4000-8000-000000000004', 'notification-coach-b@example.test', '{"full_name":"Coach B"}'),
  ('f1710000-0000-4000-8000-000000000005', 'notification-admin@example.test', '{"full_name":"Admin"}');

insert into public.user_roles (user_id, role_id)
select actor, roles.id from (values
  ('f1710000-0000-4000-8000-000000000003'::uuid, 'COACH'),
  ('f1710000-0000-4000-8000-000000000004'::uuid, 'COACH'),
  ('f1710000-0000-4000-8000-000000000005'::uuid, 'ADMIN')
) assignments(actor, role_name)
join public.roles on roles.name = assignments.role_name;

insert into public.races (id, name, event_date, distance_m) values
  ('f1711000-0000-4000-8000-000000000001', 'Notification Race', '2026-12-06', 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status) values
  ('f1712000-0000-4000-8000-000000000001', 'f1710000-0000-4000-8000-000000000001', 'f1711000-0000-4000-8000-000000000001', 15000, 'ACTIVE'),
  ('f1712000-0000-4000-8000-000000000002', 'f1710000-0000-4000-8000-000000000002', 'f1711000-0000-4000-8000-000000000001', 16000, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, tracking_start_date, created_by, status) values
  ('f1713000-0000-4000-8000-000000000001', 'f1712000-0000-4000-8000-000000000001', 'Coach Program', '2026-09-21', '2026-12-06', '2026-09-21', 'f1710000-0000-4000-8000-000000000003', 'PUBLISHED'),
  ('f1713000-0000-4000-8000-000000000002', 'f1712000-0000-4000-8000-000000000002', '2026 Other Program', '2026-09-21', '2026-12-06', '2026-09-21', 'f1710000-0000-4000-8000-000000000004', 'PUBLISHED'),
  ('f1713000-0000-4000-8000-000000000003', 'f1712000-0000-4000-8000-000000000001', 'Admin Program', '2026-09-21', '2026-12-06', '2026-09-21', 'f1710000-0000-4000-8000-000000000005', 'PUBLISHED'),
  ('f1713000-0000-4000-8000-000000000004', 'f1712000-0000-4000-8000-000000000001', 'Decline Program', '2026-09-21', '2026-12-06', '2026-09-21', 'f1710000-0000-4000-8000-000000000003', 'PUBLISHED');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status) values
  ('f1714000-0000-4000-8000-000000000001', 'f1713000-0000-4000-8000-000000000001', 1, 'Build', '2026-09-21', '2026-09-27', 'PUBLISHED');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title) values
  ('f1715000-0000-4000-8000-000000000001', 'f1714000-0000-4000-8000-000000000001', 'SPEED', '2026-09-23', 'Intervals');
insert into public.prescription_components (id, prescription_id, sequence_order, component_type, repetitions, distance_per_rep_m, recovery_duration_sec) values
  ('f1716000-0000-4000-8000-000000000001', 'f1715000-0000-4000-8000-000000000001', 1, 'INTERVAL', 5, 1000, 90);
insert into public.activities (id, athlete_id, name, sport_type, started_at, distance_m, duration_sec, source) values
  ('f1717000-0000-4000-8000-000000000001', 'f1710000-0000-4000-8000-000000000001', 'Intervals', 'RUNNING', '2026-09-23T06:00:00Z', 6000, 2700, 'MANUAL');
insert into public.training_claims (id, athlete_id, prescription_id) values
  ('f1718000-0000-4000-8000-000000000001', 'f1710000-0000-4000-8000-000000000001', 'f1715000-0000-4000-8000-000000000001');
insert into public.claim_activities (claim_id, activity_id) values
  ('f1718000-0000-4000-8000-000000000001', 'f1717000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.submit_training_claim('f1718000-0000-4000-8000-000000000001')$$, 'Athlete submission succeeds');
select * from pg_temp.throws_any_ok($$select public.submit_training_claim('f1718000-0000-4000-8000-000000000001')$$, 'repeated submission is rejected');
reset role;
select is((select result from public.claim_validations where claim_id = 'f1718000-0000-4000-8000-000000000001'), 'NEEDS_REVIEW', 'interval evidence requires Coach review');
select is((select count(*) from public.notifications where event_key = 'claim-submitted:f1718000-0000-4000-8000-000000000001'), 1::bigint, 'one Coach notification for submission');
select is((select recipient_user_id from public.notifications where event_key = 'claim-submitted:f1718000-0000-4000-8000-000000000001'), 'f1710000-0000-4000-8000-000000000003'::uuid, 'responsible Program Coach receives notification');
select set_config('test.notification_id', (select id::text from public.notifications where event_key = 'claim-submitted:f1718000-0000-4000-8000-000000000001'), true);
select * from pg_temp.throws_any_ok($$insert into public.notifications (recipient_user_id, type, event_key, title, body, target_path) values ('f1710000-0000-4000-8000-000000000003', 'CLAIM_SUBMITTED', 'unsafe-target', 'Unsafe', 'Unsafe', 'https://example.com')$$, 'external notification target is rejected by database constraint');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000004', true);
select is((select count(*) from public.notifications), 0::bigint, 'unrelated Coach cannot read notification');
select * from pg_temp.throws_any_ok($$insert into public.notifications (recipient_user_id, type, event_key, title, body) values (auth.uid(), 'CLAIM_SUBMITTED', 'forged', 'Forged', 'Forged')$$, 'client cannot insert notification');
select * from pg_temp.throws_any_ok($$update public.notifications set title = 'Forged'$$, 'client cannot update notification content');
select is(public.mark_notification_read(current_setting('test.notification_id')::uuid), false, 'unrelated Coach cannot mark notification read');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.notifications), 1::bigint, 'Coach reads own notification');
select ok(public.mark_notification_read((select id from public.notifications limit 1)), 'Coach can mark own notification read');
select is((select count(*) from public.notifications where read_at is null), 0::bigint, 'own notification is read');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.request_training_program_cancellation('f1713000-0000-4000-8000-000000000001', 'Please end program')$$, 'Athlete requests cancellation');
select lives_ok($$select public.request_training_program_cancellation('f1713000-0000-4000-8000-000000000004', 'Another request')$$, 'Athlete requests second cancellation');
select lives_ok($$select public.request_training_program_cancellation('f1713000-0000-4000-8000-000000000003', 'Admin-owned program')$$, 'Athlete can request cancellation of Admin-owned program');
reset role;
select is((select count(*) from public.notifications where type = 'PROGRAM_CANCELLATION_REQUESTED'), 2::bigint, 'only programs with responsible Coach generate operational notifications');
select is((select count(*) from public.notifications where recipient_user_id = 'f1710000-0000-4000-8000-000000000005'), 0::bigint, 'Admin authority alone is not Coach notification assignment');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000003', true);
select lives_ok(format('select public.review_training_program_cancellation(%L, %L, null)', (select id from public.training_program_cancellation_requests where training_program_id = 'f1713000-0000-4000-8000-000000000001'), 'APPROVED'), 'Coach approves request');
select lives_ok(format('select public.review_training_program_cancellation(%L, %L, null)', (select id from public.training_program_cancellation_requests where training_program_id = 'f1713000-0000-4000-8000-000000000004'), 'DECLINED'), 'Coach declines request');
select lives_ok($$select public.review_training_claim('f1718000-0000-4000-8000-000000000001', 'VERIFIED', null)$$, 'Coach reviews Claim');
select lives_ok($$select public.review_training_claim('f1718000-0000-4000-8000-000000000001', 'VERIFIED', null)$$, 'idempotent review retry succeeds');
select is((select count(*) from public.notifications), 3::bigint, 'Coach owns Claim and cancellation notifications');
select is(public.mark_all_notifications_read(), 2, 'mark all reads only remaining own unread notifications');
reset role;

select is((select count(*) from public.notifications where type = 'PROGRAM_CANCELLATION_DECIDED'), 2::bigint, 'approval and decline each notify Athlete once');
select is((select count(*) from public.notifications where event_key = 'claim-reviewed:f1718000-0000-4000-8000-000000000001'), 1::bigint, 'Coach review notifies Athlete once');
select is((select count(*) from public.notifications where event_key like 'cancellation-decided:%'), 2::bigint, 'each decision has one durable event identity');

insert into public.user_roles (user_id, role_id)
select 'f1710000-0000-4000-8000-000000000001', id from public.roles where name = 'COACH';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.notifications), 3::bigint, 'multi-role Athlete still sees own review and decision notifications');
select is(public.mark_all_notifications_read(), 3, 'Athlete marks only own notifications read');
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.notifications), 0::bigint, 'another Athlete cannot see Athlete A notifications');
select is(public.mark_all_notifications_read(), 0, 'another Athlete cannot mark Athlete A notifications read');
select set_config('request.jwt.claim.sub', 'f1710000-0000-4000-8000-000000000005', true);
select is((select count(*) from public.notifications), 0::bigint, 'Admin does not read other users notifications');
reset role;

select * from finish();
rollback;
