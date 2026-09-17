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

-- The fixture adds one private DRAFT Claim to the seeded Coach A program.
-- The RPC may reveal only its state, never Claim content or evidence.
insert into public.training_claims (
  id, athlete_id, prescription_id, athlete_note
)
values (
  'a0000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000003',
  '66000000-0000-4000-8000-000000000009',
  'Private athlete draft note'
);

select ok(
  not has_function_privilege('anon', 'public.get_authorized_program_claim_states(uuid[])', 'execute'),
  'anonymous role has no execute privilege on evaluation metadata RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_authorized_program_claim_states(uuid[])', 'execute'),
  'authenticated role can enter the RPC for server-side authorization checks'
);

set local role anon;
select pg_temp.throws_any_ok(
  $$ select * from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'anonymous cannot request program Claim states'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select pg_temp.throws_any_ok(
  $$ select * from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'athlete cannot request evaluation metadata'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000001']::uuid[])),
  8::bigint,
  'Coach receives one metadata row per prescription in own program'
);
select is(
  (select claim_status from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000002']::uuid[]) where prescription_id = '66000000-0000-4000-8000-000000000009'),
  'DRAFT'::text,
  'Coach can distinguish private DRAFT state from a genuinely unclaimed prescription'
);
select is(
  (select claim_status from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000001']::uuid[]) where prescription_id = '66000000-0000-4000-8000-000000000008'),
  null::text,
  'RPC returns null only when no Claim exists'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000005', true);
select is(
  (select count(*) from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000001']::uuid[])),
  0::bigint,
  'unrelated Coach receives no metadata for another Coach program'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.get_authorized_program_claim_states(array['64000000-0000-4000-8000-000000000001']::uuid[])),
  8::bigint,
  'ADMIN receives authorized program metadata consistently'
);
reset role;

select is(
  (
    select count(*)
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name = 'get_authorized_program_claim_states'
      and security_type = 'DEFINER'
  ),
  1::bigint,
  'evaluation metadata RPC is a narrowly scoped SECURITY DEFINER function'
);

select * from finish();
rollback;
