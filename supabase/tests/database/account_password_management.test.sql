begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.denied(p_sql text, p_description text)
returns text language plpgsql as $$
begin execute p_sql; return extensions.ok(false, p_description);
exception when others then return extensions.ok(true, p_description); end;
$$;

insert into auth.users (id, email) values
  ('c1000000-0000-4000-8000-000000000001', 'p3-admin@example.test'),
  ('c1000000-0000-4000-8000-000000000002', 'p3-athlete@example.test'),
  ('c1000000-0000-4000-8000-000000000003', 'p3-coach@example.test'),
  ('c1000000-0000-4000-8000-000000000004', 'p3-multi@example.test');
insert into public.user_roles (user_id, role_id)
select 'c1000000-0000-4000-8000-000000000001', id from public.roles where name='ADMIN';
insert into public.user_roles (user_id, role_id)
select 'c1000000-0000-4000-8000-000000000003', id from public.roles where name='COACH';
delete from public.user_roles where user_id='c1000000-0000-4000-8000-000000000003'
  and role_id=(select id from public.roles where name='ATHLETE');
insert into public.user_roles (user_id, role_id)
select 'c1000000-0000-4000-8000-000000000004', id from public.roles where name='COACH';

insert into public.strava_access_permissions (user_id, allowed, granted_at)
values
  ('c1000000-0000-4000-8000-000000000002', true, now()),
  ('c1000000-0000-4000-8000-000000000004', true, now());
set local role service_role;
select public.upsert_strava_connection(
  'c1000000-0000-4000-8000-000000000002', 930001, 'P3 Athlete',
  array['read','activity:read_all'], 'CONNECTED', 'cipher', 'iv', 'refresh', 'iv', now()+interval '1 hour'
);
select public.upsert_strava_connection(
  'c1000000-0000-4000-8000-000000000004', 930002, 'P3 Multi',
  array['read'], 'REAUTH_REQUIRED', 'cipher', 'iv', 'refresh', 'iv', now()+interval '1 hour'
);
reset role;

select ok(not has_function_privilege('anon', 'public.admin_list_user_strava_states()', 'execute'), 'anonymous cannot execute summary status RPC');
select ok(not has_function_privilege('authenticated', 'public.set_user_must_change_password(uuid,boolean)', 'execute'), 'browser cannot set forced password state');
select ok(has_function_privilege('service_role', 'public.set_user_must_change_password(uuid,boolean)', 'execute'), 'server-only role can set forced password state');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select pg_temp.denied($$ select * from public.admin_list_user_strava_states() $$, 'athlete cannot read directory connection states');
select pg_temp.denied($$ select * from public.admin_get_user_password_status('c1000000-0000-4000-8000-000000000003') $$, 'athlete cannot inspect password state');
select pg_temp.denied($$ update public.profiles set must_change_password=true where id=auth.uid() $$, 'user cannot directly alter forced password state');
select is(public.current_user_must_change_password(), false, 'normal user is not forced by default');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select pg_temp.denied($$ select * from public.admin_list_user_strava_states() $$, 'coach cannot read directory connection states');
reset role;

set local role service_role;
select public.set_user_must_change_password('c1000000-0000-4000-8000-000000000002', true);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select is(public.current_user_must_change_password(), true, 'server reset state requires password change');
select pg_temp.denied($$ select public.set_user_must_change_password(auth.uid(), false) $$, 'browser cannot bypass forced change by clearing its own flag');
reset role;

set local role service_role;
select public.set_user_must_change_password('c1000000-0000-4000-8000-000000000002', false);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select is(public.current_user_must_change_password(), false, 'server clears state only after authenticated password update succeeds');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.admin_list_user_strava_states() where user_id::text like 'c1000000-%'), 4::bigint, 'ADMIN receives one status row per fixture account');
select is((select count(*) from public.admin_list_user_strava_states() where strava_connected and user_id='c1000000-0000-4000-8000-000000000002'), 1::bigint, 'connected athlete is reported connected');
select is((select count(*) from public.admin_list_user_strava_states() where strava_connected and user_id='c1000000-0000-4000-8000-000000000004'), 0::bigint, 'allowed or reauthorization-required state is not counted as connected');
select is((select array_agg(key order by key) from
  (select * from public.admin_list_user_strava_states() limit 1) row_value,
  lateral jsonb_object_keys(to_jsonb(row_value)) key),
  array['strava_connected','user_id']::text[], 'summary RPC exposes only user ID and connection boolean');
select is((select array_agg(column_name::text order by column_name) from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name like '%password%'),
  array['must_change_password']::text[], 'application schema stores only a non-secret password-change flag');
select is((select array_agg(key order by key) from public.admin_get_user_password_status('c1000000-0000-4000-8000-000000000002') row_value,
  lateral jsonb_object_keys(to_jsonb(row_value)) key),
  array['must_change_password','user_id']::text[], 'Admin password-status read returns no password or temporary credential');
reset role;

select * from finish();
rollback;
