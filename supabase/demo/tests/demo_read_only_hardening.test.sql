-- This suite is intentionally outside supabase/tests because the demo overlay is not a production migration.
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('de010000-0000-4000-8000-000000000001', 'demo-read-only@example.test', '{"full_name":"Demo Read Only"}'),
  ('de010000-0000-4000-8000-000000000002', 'normal-control@example.test', '{"full_name":"Normal Control"}');

insert into public.notifications (
  id, recipient_user_id, type, event_key, title, body, target_path
) values (
  'de020000-0000-4000-8000-000000000001',
  'de010000-0000-4000-8000-000000000001',
  'PROGRAM_PUBLISHED',
  'demo-read-only-test',
  'Test notification',
  'Synthetic test body.',
  '/dashboard/training'
);

insert into public.demo_read_only_users (user_id)
values ('de010000-0000-4000-8000-000000000001');

select is(
  (
    select count(*)
    from pg_trigger
    where tgname = 'demo_read_only_guard'
      and not tgisinternal
  ),
  24::bigint,
  'all mutable public tables have the demo write guard'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'de010000-0000-4000-8000-000000000001', true);

select is(
  (select full_name from public.profiles where id = auth.uid()),
  'Demo Read Only',
  'demo user retains authorized read access'
);
select throws_ok(
  $$update public.profiles set full_name = 'Changed' where id = auth.uid()$$,
  '42501',
  'This demonstration account is read-only',
  'direct profile update is rejected'
);
select throws_ok(
  $$insert into public.activities (athlete_id, name, sport_type, started_at, source)
    values (auth.uid(), 'Mutation attempt', 'RUNNING', now(), 'MANUAL')$$,
  '42501',
  null,
  'direct domain insert is rejected'
);
select throws_ok(
  $$select public.mark_notification_read('de020000-0000-4000-8000-000000000001')$$,
  '42501',
  'This demonstration account is read-only',
  'mutating SECURITY DEFINER RPC is rejected by the table guard'
);
select throws_ok(
  $$select count(*) from public.demo_read_only_users$$,
  '42501',
  null,
  'authenticated users cannot inspect the private demo registry'
);
reset role;

select throws_ok(
  $$update auth.users set encrypted_password = 'changed' where id = 'de010000-0000-4000-8000-000000000001'$$,
  '42501',
  'This demonstration account identity is read-only',
  'Auth password mutation is rejected for a registered demo account'
);
select throws_ok(
  $$insert into auth.mfa_factors (id, user_id, factor_type, status)
    values ('de030000-0000-4000-8000-000000000001', 'de010000-0000-4000-8000-000000000001', 'totp', 'unverified')$$,
  '42501',
  'This demonstration account MFA configuration is read-only',
  'MFA enrollment is rejected for a registered demo account'
);
select lives_ok(
  $$update auth.users set last_sign_in_at = now() where id = 'de010000-0000-4000-8000-000000000001'$$,
  'routine Auth sign-in metadata remains writable'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'de010000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$update public.profiles set full_name = 'Normal Updated' where id = auth.uid()$$,
  'the demo overlay does not make unrelated accounts read-only'
);
reset role;

select is(
  (select read_at from public.notifications where id = 'de020000-0000-4000-8000-000000000001'),
  null::timestamptz,
  'rejected read-state mutation leaves the notification unchanged'
);

select * from finish();
rollback;
