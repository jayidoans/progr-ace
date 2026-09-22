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

insert into auth.users (id, email) values
  ('b1000000-0000-4000-8000-000000000001', 'phase2-admin@example.test'),
  ('b1000000-0000-4000-8000-000000000002', 'phase2-athlete@example.test'),
  ('b1000000-0000-4000-8000-000000000003', 'phase2-coach@example.test'),
  ('b1000000-0000-4000-8000-000000000004', 'phase2-multi@example.test'),
  ('b1000000-0000-4000-8000-000000000005', 'phase2-admin-only@example.test');
insert into public.user_roles (user_id, role_id)
select 'b1000000-0000-4000-8000-000000000001', id from public.roles where name = 'ADMIN';
insert into public.user_roles (user_id, role_id)
select 'b1000000-0000-4000-8000-000000000003', id from public.roles where name = 'COACH';
insert into public.user_roles (user_id, role_id)
select 'b1000000-0000-4000-8000-000000000004', id from public.roles where name = 'COACH';
insert into public.user_roles (user_id, role_id)
select 'b1000000-0000-4000-8000-000000000005', id from public.roles where name = 'ADMIN';
delete from public.user_roles where user_id in (
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000005'
) and role_id = (select id from public.roles where name = 'ATHLETE');

select ok(not exists (
  select 1 from public.strava_access_permissions where user_id = 'b1000000-0000-4000-8000-000000000002'
), 'new athlete is denied by default');
select is((select count(*) from public.strava_connections c left join public.strava_access_permissions p on p.user_id = c.athlete_id where p.allowed is distinct from true), 0::bigint, 'existing connection rows were backfilled as allowed');
select ok(not has_function_privilege('anon', 'public.admin_allow_strava_connection(uuid)', 'execute'), 'anon cannot grant');
select ok(not has_function_privilege('authenticated', 'public.upsert_strava_connection(uuid,bigint,text,text[],text,text,text,text,text,timestamptz)', 'execute'), 'browser cannot save credentials');
select is((select count(*) from pg_policies where schemaname='public' and tablename='strava_access_permissions'), 0::bigint, 'permission table has no broad read policy');
select is((select count(*) from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_select_admin'), 0::bigint, 'user_roles restriction remains');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select is(public.current_user_strava_permission(), false, 'athlete sees own default denial');
select pg_temp.denied($$ select * from public.admin_get_user_strava_status('b1000000-0000-4000-8000-000000000001') $$, 'athlete cannot inspect another user');
select pg_temp.denied($$ select public.admin_allow_strava_connection('b1000000-0000-4000-8000-000000000002') $$, 'athlete cannot grant self');
select pg_temp.denied($$ select allowed from public.strava_access_permissions $$, 'athlete cannot read permission table');
select pg_temp.denied($$ select public.admin_revoke_strava_permission('b1000000-0000-4000-8000-000000000002') $$, 'athlete cannot revoke permission');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000003', true);
select pg_temp.denied($$ select public.admin_allow_strava_connection('b1000000-0000-4000-8000-000000000002') $$, 'coach cannot grant');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select pg_temp.denied($$ select public.admin_allow_strava_connection('b1000000-0000-4000-8000-000000000003') $$, 'admin cannot grant coach-only');
select pg_temp.denied($$ select public.admin_allow_strava_connection('b1000000-0000-4000-8000-000000000005') $$, 'admin cannot grant admin-only');
select lives_ok($$ select public.admin_allow_strava_connection('b1000000-0000-4000-8000-000000000002') $$, 'admin grants athlete');
select lives_ok($$ select public.admin_allow_strava_connection('b1000000-0000-4000-8000-000000000004') $$, 'admin grants athlete plus coach');
select is((select permission_allowed from public.admin_get_user_strava_status('b1000000-0000-4000-8000-000000000002')), true, 'admin sees allowed state');
select is((select array_agg(key order by key) from public.admin_get_user_strava_status('b1000000-0000-4000-8000-000000000002') s,
  lateral jsonb_object_keys(to_jsonb(s)) key),
  array['connection_status','last_successful_sync_at','permission_allowed','permission_granted_at','user_id']::text[],
  'admin status exposes only safe fields');
select lives_ok($$ select public.admin_revoke_strava_permission('b1000000-0000-4000-8000-000000000004') $$, 'disconnected permission can be revoked');
reset role;
select is((select granted_by from public.strava_access_permissions where user_id='b1000000-0000-4000-8000-000000000002'), 'b1000000-0000-4000-8000-000000000001'::uuid, 'grant actor is derived from auth.uid');
select is((select revoked_by from public.strava_access_permissions where user_id='b1000000-0000-4000-8000-000000000004'), 'b1000000-0000-4000-8000-000000000001'::uuid, 'revocation actor is retained');

set local role service_role;
select public.upsert_strava_connection(
  'b1000000-0000-4000-8000-000000000002', 900001, 'Phase 2 Athlete',
  array['read','activity:read_all'], 'CONNECTED', 'cipher', 'iv', 'refresh', 'iv', now() + interval '1 hour'
);
insert into public.activities (athlete_id, name, sport_type, started_at, source, external_activity_id)
values ('b1000000-0000-4000-8000-000000000002', 'Historical Strava evidence', 'RUNNING', now(), 'STRAVA', 'phase2-history-1');
insert into public.races (id, name, event_date, distance_m)
values ('b2000000-0000-4000-8000-000000000001', 'Phase 2 Race', '2027-10-03', 10000);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('b3000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000001', 3600, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, status, created_by)
values ('b4000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'Phase 2 Program', '2027-09-06', '2027-09-12', 'PUBLISHED', 'b1000000-0000-4000-8000-000000000001');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date)
values ('b5000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 1, 'Build', '2027-09-06', '2027-09-12');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title)
values ('b6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'EASY', '2027-09-07', 'Phase 2 Easy Run');
insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m)
values ('b6000000-0000-4000-8000-000000000001', 1, 'EASY', 5000);
insert into public.training_claims (id, athlete_id, prescription_id)
values ('b7000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'b6000000-0000-4000-8000-000000000001');
insert into public.claim_activities (claim_id, activity_id)
select 'b7000000-0000-4000-8000-000000000001', id from public.activities where external_activity_id='phase2-history-1';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select public.submit_training_claim('b7000000-0000-4000-8000-000000000001');
reset role;
set local role service_role;
select pg_temp.denied($$ select public.upsert_strava_connection(
  'b1000000-0000-4000-8000-000000000004', 900002, 'Revoked Athlete',
  array['read'], 'CONNECTED', 'cipher', 'iv', 'refresh', 'iv', now() + interval '1 hour'
) $$, 'revoked permission blocks privileged OAuth finalization');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select pg_temp.denied($$ select public.admin_revoke_strava_permission('b1000000-0000-4000-8000-000000000002') $$, 'connected permission cannot be revoked');
reset role;
set local role service_role;
select public.delete_strava_connection('b1000000-0000-4000-8000-000000000002');
select is((select count(*) from public.activities where athlete_id='b1000000-0000-4000-8000-000000000002' and external_activity_id='phase2-history-1'), 1::bigint, 'disconnect preserves historical Strava Activity');
select is((select count(*) from public.training_claims where id='b7000000-0000-4000-8000-000000000001'), 1::bigint, 'disconnect preserves submitted Claim');
select is((select count(*) from public.claim_validations where claim_id='b7000000-0000-4000-8000-000000000001'), 1::bigint, 'disconnect preserves Validation');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select is((select permission_allowed from public.admin_get_user_strava_status('b1000000-0000-4000-8000-000000000002')), true, 'disconnect leaves permission allowed');
select lives_ok($$ select public.admin_revoke_strava_permission('b1000000-0000-4000-8000-000000000002') $$, 'permission revokes after disconnect');
select is((select array_agg(key order by key) from public.admin_list_users() u,
  lateral jsonb_object_keys(to_jsonb(u)) key where u.user_id='b1000000-0000-4000-8000-000000000002'),
  array['email','full_name','roles','user_id']::text[], 'phase 1 directory still has safe fields');
reset role;
select * from finish();
rollback;
