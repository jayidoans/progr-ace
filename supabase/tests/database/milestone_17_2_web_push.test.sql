begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.rejects(p_sql text, p_label text) returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_label);
exception when others then
  return extensions.ok(true, p_label);
end;
$$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('f1720000-0000-4000-8000-000000000001','push-athlete@example.test','{"full_name":"Push Athlete"}'),
  ('f1720000-0000-4000-8000-000000000002','push-coach@example.test','{"full_name":"Push Coach"}'),
  ('f1720000-0000-4000-8000-000000000003','push-other@example.test','{"full_name":"Other Athlete"}');
insert into public.user_roles(user_id,role_id)
select 'f1720000-0000-4000-8000-000000000002', id from public.roles where name = 'COACH';
insert into public.races(id,name,event_date,distance_m) values
  ('f1721000-0000-4000-8000-000000000001','Push Race',current_date + 90,42195);
insert into public.athlete_race_goals(id,athlete_id,race_id,target_finish_time_sec,status) values
  ('f1722000-0000-4000-8000-000000000001','f1720000-0000-4000-8000-000000000001','f1721000-0000-4000-8000-000000000001',14400,'ACTIVE');
insert into public.training_programs(id,race_goal_id,name,start_date,end_date,tracking_start_date,created_by,status) values
  ('f1723000-0000-4000-8000-000000000001','f1722000-0000-4000-8000-000000000001','Push Plan',date_trunc('week',current_date)::date - 21,current_date + 90,date_trunc('week',current_date)::date - 21,'f1720000-0000-4000-8000-000000000002','DRAFT');
insert into public.training_weeks(id,training_program_id,week_number,phase,start_date,end_date,planning_status) values
  ('f1724000-0000-4000-8000-000000000001','f1723000-0000-4000-8000-000000000001',1,'Build',date_trunc('week',current_date)::date + 7,date_trunc('week',current_date)::date + 13,'DRAFT');
insert into public.training_prescriptions(id,training_week_id,training_menu,scheduled_date,title) values
  ('f1725000-0000-4000-8000-000000000001','f1724000-0000-4000-8000-000000000001','EASY',date_trunc('week',current_date)::date + 8,'Easy Run');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1720000-0000-4000-8000-000000000001',true);
select * from pg_temp.rejects($$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_secret)
  values (auth.uid(),'https://fcm.googleapis.com/fcm/send/forged','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','aaaaaaaaaaaa')$$,
  'client cannot insert subscriptions directly');
select lives_ok($$select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/device-a','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')$$,
  'Athlete registers own browser');
select ok(public.push_subscription_is_active('https://fcm.googleapis.com/fcm/send/device-a'),'Athlete sees own device state');
select * from pg_temp.rejects($$select public.claim_push_deliveries(5)$$,'client cannot trigger delivery');
select * from pg_temp.rejects($$select public.finish_push_delivery(gen_random_uuid(),'DELIVERED',201)$$,'client cannot finish delivery');
select * from pg_temp.rejects($$update public.push_subscriptions set user_id = auth.uid()$$,
  'client cannot edit subscription owner or keys');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1720000-0000-4000-8000-000000000003',true);
select * from pg_temp.rejects($$select count(*) from public.push_subscriptions$$,'other Athlete cannot read subscription');
select * from pg_temp.rejects($$select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/device-a','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')$$,
  'endpoint cannot be reassigned to another account');
select is(public.revoke_push_subscription('https://fcm.googleapis.com/fcm/send/device-a'),false,'other Athlete cannot revoke device');
reset role;

select * from pg_temp.rejects($$update public.training_programs set status = 'PUBLISHED', end_date = current_date + 91
  where id = 'f1723000-0000-4000-8000-000000000001'$$,
  'invalid publication attempt does not write notifications');
select is((select count(*) from public.notifications),0::bigint,'no notification before successful publication');

update public.training_programs set status = 'PUBLISHED' where id = 'f1723000-0000-4000-8000-000000000001';
select is((select count(*) from public.notifications where type = 'PROGRAM_PUBLISHED'),1::bigint,'first Program publication notifies Athlete once');
select is((select count(*) from public.notifications where type = 'WEEKLY_PLAN_PUBLISHED'),0::bigint,'initial week does not double notify');
select is((select count(*) from public.push_deliveries),1::bigint,'notification atomically queues push for enabled device');
select is((select recipient_user_id from public.notifications where type = 'PROGRAM_PUBLISHED'),
  'f1720000-0000-4000-8000-000000000001'::uuid,'publication recipient is assigned Athlete');
update public.training_programs set status = 'PUBLISHED' where id = 'f1723000-0000-4000-8000-000000000001';
select is((select count(*) from public.notifications where type = 'PROGRAM_PUBLISHED'),1::bigint,'repeat Program update does not duplicate');

insert into public.training_weeks(id,training_program_id,week_number,phase,start_date,end_date,planning_status) values
  ('f1724000-0000-4000-8000-000000000002','f1723000-0000-4000-8000-000000000001',2,'Build',date_trunc('week',current_date)::date + 14,date_trunc('week',current_date)::date + 20,'DRAFT');
insert into public.training_prescriptions(id,training_week_id,training_menu,scheduled_date,title) values
  ('f1725000-0000-4000-8000-000000000002','f1724000-0000-4000-8000-000000000002','EASY',date_trunc('week',current_date)::date + 15,'Second Week');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1720000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.publish_training_week('f1724000-0000-4000-8000-000000000002')$$,'Coach publishes subsequent week');
select lives_ok($$select public.publish_training_week('f1724000-0000-4000-8000-000000000002')$$,'repeat publication is idempotent');
reset role;
select is((select count(*) from public.notifications where type = 'WEEKLY_PLAN_PUBLISHED'),1::bigint,'subsequent Week notifies once');
select is((select count(*) from public.push_deliveries),2::bigint,'second notification queues one delivery');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1720000-0000-4000-8000-000000000003',true);
select * from pg_temp.rejects($$insert into public.push_deliveries(notification_id,subscription_id)
  values (gen_random_uuid(),gen_random_uuid())$$,'ordinary client cannot create delivery work');
reset role;

-- A historical DRAFT week can be published under M11.3 without sending stale alerts.
insert into public.training_weeks(id,training_program_id,week_number,phase,start_date,end_date,planning_status) values
  ('f1724000-0000-4000-8000-000000000003','f1723000-0000-4000-8000-000000000001',3,'Historical',date_trunc('week',current_date)::date - 14,date_trunc('week',current_date)::date - 8,'DRAFT');
update public.training_weeks set planning_status = 'PUBLISHED' where id = 'f1724000-0000-4000-8000-000000000003';
select is((select count(*) from public.notifications where type = 'WEEKLY_PLAN_PUBLISHED'),1::bigint,'historical week does not alert');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*) from public.claim_push_deliveries(5)),2::bigint,'service dispatcher claims bounded work');
select is((select count(*) from public.claim_push_deliveries(5)),0::bigint,'lease prevents immediate duplicate claim');
select public.finish_push_delivery((select id from public.push_deliveries order by created_at,id limit 1),'DELIVERED',201);
select is((select count(*) from public.push_deliveries where status = 'DELIVERED'),1::bigint,'successful push marked delivered');
select public.finish_push_delivery((select id from public.push_deliveries where status = 'IN_FLIGHT' limit 1),'GONE',410);
select is((select count(*) from public.push_subscriptions where revoked_at is not null),1::bigint,'expired endpoint revoked');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1720000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/device-b','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')$$,
  'Athlete can enable a second device');
reset role;
insert into public.notifications(recipient_user_id,type,event_key,title,body,target_path)
values ('f1720000-0000-4000-8000-000000000001','PROGRAM_PUBLISHED','push-retry-fixture',
  'Your training program is ready','Your coach has published your training program.','/dashboard');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*) from public.claim_push_deliveries(5)),1::bigint,'new device receives one claimed delivery');
select public.finish_push_delivery((select id from public.push_deliveries where status = 'IN_FLIGHT' limit 1),'RETRY',503);
select is((select count(*) from public.push_deliveries where status = 'PENDING' and attempts = 1),1::bigint,'transient failure remains pending');
reset role;
update public.push_deliveries set next_attempt_at = now() - interval '1 minute' where status = 'PENDING';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*) from public.claim_push_deliveries(5)),1::bigint,'first retry is claimable when due');
select public.finish_push_delivery((select id from public.push_deliveries where status = 'IN_FLIGHT' limit 1),'RETRY',503);
reset role;
update public.push_deliveries set next_attempt_at = now() - interval '1 minute' where status = 'PENDING';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*) from public.claim_push_deliveries(5)),1::bigint,'second retry is bounded third attempt');
select public.finish_push_delivery((select id from public.push_deliveries where status = 'IN_FLIGHT' limit 1),'RETRY',503);
select is((select count(*) from public.push_deliveries where status = 'FAILED' and attempts = 3),1::bigint,'third transient failure stops retrying');
reset role;
select is((select count(*) from public.notifications where event_key = 'push-retry-fixture'),1::bigint,
  'push failure never removes the durable application notification');

select * from finish();
rollback;
