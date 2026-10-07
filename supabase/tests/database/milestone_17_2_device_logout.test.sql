begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data) values
  ('f1730000-0000-4000-8000-000000000001','device-owner@example.test','{"full_name":"Device Owner"}'),
  ('f1730000-0000-4000-8000-000000000002','device-other@example.test','{"full_name":"Other Account"}');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1730000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/device-a','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')$$,
  'Device A can register');
select lives_ok($$select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/device-b','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')$$,
  'Device B can register for the same account');
reset role;

insert into public.notifications(recipient_user_id,type,event_key,title,body,target_path)
values ('f1730000-0000-4000-8000-000000000001','PROGRAM_PUBLISHED','device-test-before',
  'Your training program is ready','Your coach has published your training program.','/dashboard');
select is((select count(*) from public.push_deliveries where status = 'PENDING'),2::bigint,
  'outbox initially contains one delivery per device');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1730000-0000-4000-8000-000000000001',true);
select ok(public.revoke_push_subscription('https://fcm.googleapis.com/fcm/send/device-a'),
  'ordinary Device A logout revokes only its endpoint');
select is(public.push_subscription_is_active('https://fcm.googleapis.com/fcm/send/device-a'),false,
  'Device A is no longer active');
select is(public.push_subscription_is_active('https://fcm.googleapis.com/fcm/send/device-b'),true,
  'Device B remains active');
reset role;

select is((select count(*) from public.push_deliveries delivery
  join public.push_subscriptions subscription on subscription.id = delivery.subscription_id
  where subscription.endpoint = 'https://fcm.googleapis.com/fcm/send/device-a' and delivery.status = 'CANCELLED'),1::bigint,
  'pending Device A delivery is cancelled');
select is((select count(*) from public.push_deliveries delivery
  join public.push_subscriptions subscription on subscription.id = delivery.subscription_id
  where subscription.endpoint = 'https://fcm.googleapis.com/fcm/send/device-b' and delivery.status = 'PENDING'),1::bigint,
  'Device B outbox delivery remains pending');

insert into public.notifications(recipient_user_id,type,event_key,title,body,target_path)
values ('f1730000-0000-4000-8000-000000000001','PROGRAM_PUBLISHED','device-test-after',
  'Your training program is ready','Your coach has published your training program.','/dashboard');
select is((select count(*) from public.push_deliveries delivery
  join public.push_subscriptions subscription on subscription.id = delivery.subscription_id
  join public.notifications notification on notification.id = delivery.notification_id
  where notification.event_key = 'device-test-after' and subscription.endpoint = 'https://fcm.googleapis.com/fcm/send/device-a'),0::bigint,
  'future notifications do not queue Device A');
select is((select count(*) from public.push_deliveries delivery
  join public.notifications notification on notification.id = delivery.notification_id
  where notification.event_key = 'device-test-after'),1::bigint,
  'future notification still queues Device B');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1730000-0000-4000-8000-000000000002',true);
select is(public.revoke_push_subscription('https://fcm.googleapis.com/fcm/send/device-b'),false,
  'different account cannot revoke Device B');
select is(public.push_subscription_is_active('https://fcm.googleapis.com/fcm/send/device-b'),false,
  'different account cannot claim Device B ownership');
reset role;
select is((select user_id from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/device-b'),
  'f1730000-0000-4000-8000-000000000001'::uuid,'subscription ownership never transfers');

select * from finish();
rollback;
