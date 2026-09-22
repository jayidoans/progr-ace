begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.throws_any_ok(p_sql text, p_description text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when others then
  return extensions.ok(true, p_description);
end;
$$;

select results_eq(
  $$ select name from public.roles order by name $$,
  $$ values ('ADMIN'::text), ('ATHLETE'::text), ('COACH'::text) $$,
  'M7 preserves the exact M1 role codes'
);

insert into public.strava_oauth_states (state_hash, athlete_id, created_at, expires_at)
values (
  repeat('e', 64),
  '61000000-0000-4000-8000-000000000003',
  now() - interval '2 minutes',
  now() - interval '1 minute'
);

set local role anon;
select pg_temp.throws_any_ok(
  $$ select athlete_id from public.strava_connections $$,
  'anonymous cannot read Strava connection status'
);
select pg_temp.throws_any_ok(
  $$ select state_hash from public.strava_oauth_states $$,
  'anonymous cannot read OAuth state'
);
select pg_temp.throws_any_ok(
  $$ select public.create_strava_oauth_state(repeat('a', 64), now() + interval '10 minutes') $$,
  'anonymous cannot initiate OAuth state'
);
select pg_temp.throws_any_ok(
  $$ select public.get_strava_connection_credentials('61000000-0000-4000-8000-000000000003') $$,
  'anonymous cannot request encrypted credentials'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);

select lives_ok(
  $$ select public.create_strava_oauth_state(repeat('a', 64), now() + interval '10 minutes') $$,
  'authenticated Athlete A can initiate OAuth state'
);
select pg_temp.throws_any_ok(
  $$ select state_hash from public.strava_oauth_states $$,
  'Athlete cannot directly inspect OAuth state rows'
);
select ok(
  public.consume_strava_oauth_state(repeat('a', 64)),
  'matching unexpired state is consumed once'
);
select ok(
  not public.consume_strava_oauth_state(repeat('a', 64)),
  'consumed OAuth state cannot be replayed'
);
select ok(
  not public.consume_strava_oauth_state(repeat('e', 64)),
  'expired OAuth state is rejected and consumed'
);

select public.create_strava_oauth_state(repeat('b', 64), now() + interval '10 minutes');
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000004', true);
select ok(
  not public.consume_strava_oauth_state(repeat('b', 64)),
  'Athlete B cannot consume Athlete A OAuth state'
);

reset role;
set local role service_role;
insert into public.strava_access_permissions (user_id, allowed, granted_at)
values
  ('61000000-0000-4000-8000-000000000003', true, now()),
  ('61000000-0000-4000-8000-000000000004', true, now());
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$ select public.upsert_strava_connection(
    '61000000-0000-4000-8000-000000000003',
    700001,
    'Strava Athlete A',
    array['activity:read_all', 'read'],
    'CONNECTED',
    'encrypted-access-a',
    'access-iv-a',
    'encrypted-refresh-a',
    'refresh-iv-a',
    now() + interval '5 minutes'
  ) $$,
  'Athlete A can persist its encrypted Strava connection through the RPC'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select is(
  (select strava_athlete_id from public.strava_connections),
  700001::bigint,
  'Athlete A reads its safe connection status'
);
select pg_temp.throws_any_ok(
  $$ select access_token_ciphertext from public.strava_connections $$,
  'Athlete A cannot select encrypted access-token columns directly'
);
select pg_temp.throws_any_ok(
  $$ select refresh_token_ciphertext from public.strava_connections $$,
  'Athlete A cannot select encrypted refresh-token columns directly'
);
select pg_temp.throws_any_ok(
  $$ insert into public.strava_connections (
    athlete_id, strava_athlete_id, granted_scopes, connection_status,
    access_token_ciphertext, access_token_iv, refresh_token_ciphertext,
    refresh_token_iv, access_token_expires_at
  ) values (
    auth.uid(), 700009, array['read'], 'CONNECTED', 'x', 'x', 'x', 'x', now()
  ) $$,
  'Athlete cannot bypass the connection RPC with direct insert'
);
select pg_temp.throws_any_ok(
  $$ select public.upsert_strava_connection(
    auth.uid(), 700009, 'Spoofed identity', array['read'], 'REAUTH_REQUIRED',
    'x', 'x', 'x', 'x', now() + interval '1 hour'
  ) $$,
  'browser-authenticated Athlete cannot call the server-only credential RPC'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000004', true);
select is(
  (select count(strava_athlete_id) from public.strava_connections),
  0::bigint,
  'Athlete B cannot read Athlete A connection'
);

reset role;
set local role service_role;
select pg_temp.throws_any_ok(
  $$ select public.upsert_strava_connection(
    '61000000-0000-4000-8000-000000000004',
    700001,
    'Duplicate Athlete',
    array['activity:read_all', 'read'],
    'CONNECTED',
    'encrypted-access-b',
    'access-iv-b',
    'encrypted-refresh-b',
    'refresh-iv-b',
    now() + interval '1 hour'
  ) $$,
  'the same Strava identity cannot bind to two ProgrACE athletes'
);
select lives_ok(
  $$ select public.upsert_strava_connection(
    '61000000-0000-4000-8000-000000000004',
    700002,
    'Strava Athlete B',
    array['activity:read_all', 'read'],
    'CONNECTED',
    'encrypted-access-b',
    'access-iv-b',
    'encrypted-refresh-b',
    'refresh-iv-b',
    now() + interval '2 hours'
  ) $$,
  'Athlete B can create one distinct connection'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000004', true);
select is(
  (select count(strava_athlete_id) from public.strava_connections),
  1::bigint,
  'Athlete B still sees only its own connection'
);

reset role;
set local role service_role;
select is(
  (select refresh_state from public.claim_strava_token_refresh(
    '61000000-0000-4000-8000-000000000003',
    now() + interval '1 hour',
    '71000000-0000-4000-8000-000000000001',
    30
  )),
  'ACQUIRED',
  'near-expiry token acquires the refresh lease'
);
select is(
  (select refresh_state from public.claim_strava_token_refresh(
    '61000000-0000-4000-8000-000000000003',
    now() + interval '1 hour',
    '71000000-0000-4000-8000-000000000002',
    30
  )),
  'BUSY',
  'a concurrent refresh cannot acquire an active lease'
);
select ok(
  not public.complete_strava_token_refresh(
    '61000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000002',
    2,
    'stale-access', 'stale-access-iv', 'stale-refresh', 'stale-refresh-iv',
    now() + interval '6 hours'
  ),
  'a non-owner refresh lease cannot overwrite credentials'
);
select ok(
  public.complete_strava_token_refresh(
    '61000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000001',
    2,
    'rotated-access', 'rotated-access-iv', 'rotated-refresh', 'rotated-refresh-iv',
    now() + interval '6 hours'
  ),
  'the active lease atomically stores the rotated refresh token'
);
select is(
  (select refresh_state from public.claim_strava_token_refresh(
    '61000000-0000-4000-8000-000000000003',
    now() + interval '1 hour',
    '71000000-0000-4000-8000-000000000003',
    30
  )),
  'VALID',
  'fresh access token does not refresh unnecessarily'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
select pg_temp.throws_any_ok(
  $$ select * from public.get_strava_connection_credentials('61000000-0000-4000-8000-000000000003') $$,
  'COACH cannot receive athlete OAuth credential material'
);
select pg_temp.throws_any_ok(
  $$ select public.delete_strava_connection('61000000-0000-4000-8000-000000000003') $$,
  'COACH cannot disconnect an athlete connection'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select pg_temp.throws_any_ok(
  $$ select * from public.get_strava_connection_credentials('61000000-0000-4000-8000-000000000003') $$,
  'ADMIN does not receive athlete OAuth credential material'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select pg_temp.throws_any_ok(
  $$ select public.delete_strava_connection('61000000-0000-4000-8000-000000000003') $$,
  'Athlete cannot bypass provider revocation with a direct local delete'
);

reset role;
set local role service_role;
select ok(
  public.delete_strava_connection('61000000-0000-4000-8000-000000000003'),
  'server-only disconnect removes the owner connection after provider revocation'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select is(
  (select count(strava_athlete_id) from public.strava_connections),
  0::bigint,
  'disconnected connection is no longer visible'
);
reset role;
set local role service_role;
select ok(
  public.delete_strava_connection('61000000-0000-4000-8000-000000000003'),
  'repeated server-only local disconnect is idempotent'
);
reset role;

select * from finish();
rollback;
