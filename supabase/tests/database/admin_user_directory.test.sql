begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.denied(p_sql text, p_description text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when sqlstate '42501' then
  return extensions.ok(true, p_description);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-4000-8000-000000000001', 'directory-athlete@example.test', '{"full_name":"Directory Athlete"}'),
  ('a1000000-0000-4000-8000-000000000002', 'directory-coach@example.test', '{"full_name":"Directory Coach"}'),
  ('a1000000-0000-4000-8000-000000000003', 'directory-admin@example.test', '{"full_name":"Directory Admin"}'),
  ('a1000000-0000-4000-8000-000000000004', 'directory-multi@example.test', '{"full_name":"Directory Multi"}'),
  ('a1000000-0000-4000-8000-000000000005', 'directory-coach-only@example.test', '{"full_name":"Directory Coach Only"}');

insert into public.user_roles (user_id, role_id)
select 'a1000000-0000-4000-8000-000000000002', id from public.roles where name = 'COACH';
insert into public.user_roles (user_id, role_id)
select 'a1000000-0000-4000-8000-000000000003', id from public.roles where name = 'ADMIN';
insert into public.user_roles (user_id, role_id)
select 'a1000000-0000-4000-8000-000000000004', id from public.roles where name in ('COACH', 'ADMIN');
insert into public.user_roles (user_id, role_id)
select 'a1000000-0000-4000-8000-000000000005', id from public.roles where name = 'COACH';
delete from public.user_roles where user_id = 'a1000000-0000-4000-8000-000000000005'
  and role_id = (select id from public.roles where name = 'ATHLETE');

select ok(not has_function_privilege('anon', 'public.admin_list_users()', 'execute'), 'anon cannot execute directory RPC');
select ok(has_function_privilege('authenticated', 'public.admin_list_users()', 'execute'), 'authenticated role enters guarded RPC');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'user_roles_select_admin'), 0::bigint, 'broad admin role policy removed');
select is((select count(*) from information_schema.routines where routine_schema = 'public' and routine_name = 'admin_list_users' and security_type = 'DEFINER'), 1::bigint, 'RPC is SECURITY DEFINER');

set local role anon;
select pg_temp.denied('select * from public.admin_list_users()', 'unauthenticated caller is rejected');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select pg_temp.denied('select * from public.admin_list_users()', 'ATHLETE cannot read directory');
select is((select count(*) from public.user_roles where user_id = 'a1000000-0000-4000-8000-000000000003'), 0::bigint, 'ordinary user cannot directly read another user roles');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select pg_temp.denied('select * from public.admin_list_users()', 'ATHLETE + COACH cannot read directory');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000005', true);
select pg_temp.denied('select * from public.admin_list_users()', 'COACH-only cannot read directory');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.admin_list_users() where user_id in (
  'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004'
)), 4::bigint, 'ADMIN sees all fixture profiles');
select is((select roles from public.admin_list_users() where user_id = 'a1000000-0000-4000-8000-000000000004'), array['ATHLETE','COACH','ADMIN']::text[], 'multi-role assignment is complete and ordered');
select is((select email from public.admin_list_users() where user_id = 'a1000000-0000-4000-8000-000000000001'), 'directory-athlete@example.test'::text, 'directory uses application profile email');
select is((select array_agg(key order by key) from public.admin_list_users() u,
  lateral jsonb_object_keys(to_jsonb(u)) key
  where u.user_id = 'a1000000-0000-4000-8000-000000000001'),
  array['email','full_name','roles','user_id']::text[],
  'directory rows expose exactly four safe columns, no credentials or auth metadata');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000004', true);
select ok((select count(*) from public.admin_list_users()) >= 4, 'multi-role ADMIN can inspect directory');
reset role;

select * from finish();
rollback;
