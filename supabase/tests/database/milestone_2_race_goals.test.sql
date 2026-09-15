begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(22);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'athlete-one@example.test', '{"full_name":"Athlete One"}'),
  ('10000000-0000-0000-0000-000000000002', 'athlete-two@example.test', '{"full_name":"Athlete Two"}'),
  ('10000000-0000-0000-0000-000000000003', 'admin@example.test', '{"full_name":"Admin User"}');

insert into public.user_roles (user_id, role_id)
select '10000000-0000-0000-0000-000000000003', id
from public.roles
where name = 'ADMIN'
on conflict (user_id, role_id) do nothing;

insert into public.races (id, name, event_date, distance_m, location)
values
  ('20000000-0000-0000-0000-000000000001', 'Fixture 5K', '2027-01-10', 5000, 'Bandung'),
  ('20000000-0000-0000-0000-000000000002', 'Fixture 10K', '2027-02-14', 10000, 'Jakarta'),
  ('20000000-0000-0000-0000-000000000003', 'Fixture Half', '2027-03-21', 21098, 'Surabaya');

insert into public.athlete_race_goals (
  id,
  athlete_id,
  race_id,
  target_finish_time_sec,
  status,
  notes
)
values (
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  3600,
  'ACTIVE',
  'Other athlete goal'
);

set local role anon;
select throws_ok($$ select * from public.races $$);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.races),
  3::bigint,
  'authenticated users can read shared races'
);

select lives_ok(
  $$
    insert into public.races (
      name, event_date, distance_m, created_by
    ) values (
      'Athlete-created Marathon',
      '2027-04-18',
      42195,
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  'an authenticated user can create a race with their own provenance'
);

select throws_ok(
  $$
    insert into public.races (
      name, event_date, distance_m, created_by
    ) values (
      'Wrong provenance race',
      '2027-05-23',
      5000,
      '10000000-0000-0000-0000-000000000002'
    )
  $$
);

select lives_ok(
  $$
    insert into public.athlete_race_goals (
      athlete_id, race_id, target_finish_time_sec, status, notes
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      1500,
      'ACTIVE',
      'Original history note'
    )
  $$,
  'an athlete can create their own active race goal'
);

select is(
  (select count(*) from public.athlete_race_goals),
  1::bigint,
  'an athlete can read their own race goals'
);

select is(
  (
    select count(*)
    from public.athlete_race_goals
    where athlete_id = '10000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'another athlete race goal is hidden by RLS'
);

select throws_ok(
  $$
    insert into public.athlete_race_goals (
      athlete_id, race_id, target_finish_time_sec, status
    ) values (
      '10000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000003',
      7200,
      'ACTIVE'
    )
  $$
);

select throws_ok(
  $$
    insert into public.athlete_race_goals (
      athlete_id, race_id, target_finish_time_sec, status
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      3300,
      'ACTIVE'
    )
  $$
);

select lives_ok(
  $$
    select public.set_active_race_goal(
      '20000000-0000-0000-0000-000000000003',
      7140,
      'New active goal'
    )
  $$,
  'active goal switching succeeds atomically'
);

select ok(
  (
    select count(*) = 1
      and bool_and(race_id = '20000000-0000-0000-0000-000000000003')
    from public.athlete_race_goals
    where status = 'ACTIVE'
  )
  and (
    select status = 'CANCELLED'
    from public.athlete_race_goals
    where race_id = '20000000-0000-0000-0000-000000000001'
  ),
  'switching leaves one new active goal and cancels the previous goal'
);

select throws_ok(
  $$
    delete from public.athlete_race_goals
    where race_id = '20000000-0000-0000-0000-000000000001'
  $$
);

update public.athlete_race_goals
set notes = 'Rewritten history'
where race_id = '20000000-0000-0000-0000-000000000001';

select is(
  (
    select notes
    from public.athlete_race_goals
    where race_id = '20000000-0000-0000-0000-000000000001'
  ),
  'Original history note',
  'terminal race-goal history cannot be rewritten'
);

select lives_ok(
  $$
    select public.set_active_race_goal(
      '20000000-0000-0000-0000-000000000003',
      7000,
      'Adjusted target for the same race'
    )
  $$,
  'setting the same active race updates its mutable planning fields'
);

select ok(
  (
    select count(*) = 2
      and count(*) filter (
        where status = 'ACTIVE'
          and race_id = '20000000-0000-0000-0000-000000000003'
          and target_finish_time_sec = 7000
      ) = 1
    from public.athlete_race_goals
  ),
  'changing the same race target does not create another historical goal'
);

select throws_ok(
  $$
    select public.set_active_race_goal(
      '29999999-0000-0000-0000-000000000000',
      7000,
      'This insert must fail'
    )
  $$
);

select is(
  (
    select race_id
    from public.athlete_race_goals
    where status = 'ACTIVE'
  ),
  '20000000-0000-0000-0000-000000000003'::uuid,
  'a failed switch rolls back cancellation of the existing active goal'
);

reset role;

select throws_ok(
  $$
    delete from public.races
    where id = '20000000-0000-0000-0000-000000000001'
  $$
);

select ok(
  (
    select bool_and(
      class.relrowsecurity
      and class.relforcerowsecurity
      and not has_table_privilege('anon', class.oid, 'SELECT')
      and not has_table_privilege('anon', class.oid, 'INSERT')
      and not has_table_privilege('authenticated', class.oid, 'SELECT')
      and not has_table_privilege('authenticated', class.oid, 'INSERT')
    )
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'training_claims',
        'claim_activities'
      )
  ),
  'claim domains later than Milestone 4 have forced RLS and no anon/authenticated CRUD access'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

select lives_ok(
  $$
    update public.races
    set name = 'Admin-updated 10K'
    where id = '20000000-0000-0000-0000-000000000002'
  $$,
  'the existing ADMIN role can manage race master data'
);

select is(
  (
    select name
    from public.races
    where id = '20000000-0000-0000-0000-000000000002'
  ),
  'Admin-updated 10K',
  'the administrator update is persisted'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

update public.races
set name = 'Athlete rewrite attempt'
where id = '20000000-0000-0000-0000-000000000002';

select is(
  (
    select name
    from public.races
    where id = '20000000-0000-0000-0000-000000000002'
  ),
  'Admin-updated 10K',
  'a normal athlete cannot update shared race master data'
);

reset role;

select * from finish();
rollback;
