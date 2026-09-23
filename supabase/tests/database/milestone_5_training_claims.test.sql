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

insert into auth.users (id, email, raw_user_meta_data)
values
  ('71000000-0000-0000-0000-000000000001', 'claim-athlete-a@example.test', '{"full_name":"Claim Athlete A"}'),
  ('71000000-0000-0000-0000-000000000002', 'claim-athlete-b@example.test', '{"full_name":"Claim Athlete B"}'),
  ('71000000-0000-0000-0000-000000000003', 'claim-coach@example.test', '{"full_name":"Claim Coach"}');

insert into public.user_roles (user_id, role_id)
select '71000000-0000-0000-0000-000000000003', id
from public.roles where name = 'COACH'
on conflict do nothing;

insert into public.races (id, name, event_date, distance_m, location)
values ('72000000-0000-0000-0000-000000000001', 'M5 Test Race', '2027-02-14', 21098, 'Jakarta');

insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values
  ('73000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 7200, 'ACTIVE'),
  ('73000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 7500, 'ACTIVE');

insert into public.training_programs (id, race_goal_id, name, start_date, end_date, status, created_by)
values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 'Published A', '2027-01-04', '2027-01-17', 'PUBLISHED', '71000000-0000-0000-0000-000000000003'),
  ('74000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000002', 'Published B', '2027-01-04', '2027-01-17', 'PUBLISHED', '71000000-0000-0000-0000-000000000003'),
  ('74000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000001', 'Draft A', '2027-01-18', '2027-01-24', 'DRAFT', '71000000-0000-0000-0000-000000000003');

insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status)
values
  ('75000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 1, 'M5 A', '2027-01-04', '2027-01-10', 'PUBLISHED'),
  ('75000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001', 2, 'M5 A2', '2027-01-11', '2027-01-17', 'PUBLISHED'),
  ('75000000-0000-0000-0000-000000000003', '74000000-0000-0000-0000-000000000002', 1, 'M5 B', '2027-01-04', '2027-01-10', 'PUBLISHED'),
  ('75000000-0000-0000-0000-000000000004', '74000000-0000-0000-0000-000000000003', 1, 'M5 Draft', '2027-01-18', '2027-01-24', 'DRAFT');

insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title)
values
  ('76000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', 'EASY', '2027-01-05', 'Normal 5K'),
  ('76000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000001', 'LONG', '2027-01-10', 'Long 16K'),
  ('76000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000001', 'LONG', '2027-01-09', 'Short evidence'),
  ('76000000-0000-0000-0000-000000000004', '75000000-0000-0000-0000-000000000001', 'SPEED', '2027-01-07', 'Alternative sport'),
  ('76000000-0000-0000-0000-000000000005', '75000000-0000-0000-0000-000000000001', 'MEDIUM', '2027-01-08', 'Zero draft'),
  ('76000000-0000-0000-0000-000000000006', '75000000-0000-0000-0000-000000000002', 'EASY', '2027-01-12', 'Atomic rollback'),
  ('76000000-0000-0000-0000-000000000007', '75000000-0000-0000-0000-000000000002', 'EASY', '2027-01-13', 'Draft release source'),
  ('76000000-0000-0000-0000-000000000008', '75000000-0000-0000-0000-000000000002', 'EASY', '2027-01-14', 'Draft release target'),
  ('76000000-0000-0000-0000-000000000009', '75000000-0000-0000-0000-000000000003', 'EASY', '2027-01-05', 'Athlete B prescription'),
  ('76000000-0000-0000-0000-000000000010', '75000000-0000-0000-0000-000000000004', 'EASY', '2027-01-19', 'Unpublished prescription');

insert into public.prescription_components (prescription_id, sequence_order, component_type, target_distance_m)
values
  ('76000000-0000-0000-0000-000000000001', 1, 'EASY', 5000),
  ('76000000-0000-0000-0000-000000000002', 1, 'LONG', 16000),
  ('76000000-0000-0000-0000-000000000003', 1, 'LONG', 14000);

insert into public.prescription_components (prescription_id, sequence_order, component_type, repetitions, distance_per_rep_m)
values ('76000000-0000-0000-0000-000000000004', 1, 'INTERVAL', 8, 400);

insert into public.activities (
  id, athlete_id, name, sport_type, started_at, distance_m, duration_sec, rpe, notes, source
)
values
  ('77000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'Normal run', 'RUNNING', '2027-01-05T06:00:00Z', 5100, 2130, 4, null, 'MANUAL'),
  ('77000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000001', 'Long part 10K', 'RUNNING', '2027-01-10T06:00:00Z', 10000, 3900, 5, null, 'MANUAL'),
  ('77000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000001', 'Long part 6K', 'RUNNING', '2027-01-10T07:30:00Z', 6000, 2340, 5, null, 'MANUAL'),
  ('77000000-0000-0000-0000-000000000004', '71000000-0000-0000-0000-000000000001', 'Short run', 'RUNNING', '2027-01-09T06:00:00Z', 7390, 3402, 5, 'Stopped early because I was not feeling well.', 'MANUAL'),
  ('77000000-0000-0000-0000-000000000005', '71000000-0000-0000-0000-000000000001', 'Padel replacement', 'PADEL', '2027-01-07T18:00:00Z', null, 5400, 7, null, 'MANUAL'),
  ('77000000-0000-0000-0000-000000000006', '71000000-0000-0000-0000-000000000001', 'Atomic valid', 'RUNNING', '2027-01-12T06:00:00Z', 4000, 1800, 4, null, 'MANUAL'),
  ('77000000-0000-0000-0000-000000000007', '71000000-0000-0000-0000-000000000001', 'Draft editable', 'RUNNING', '2027-01-13T06:00:00Z', 3000, 1500, 4, null, 'MANUAL'),
  ('77000000-0000-0000-0000-000000000009', '71000000-0000-0000-0000-000000000002', 'Athlete B evidence', 'RUNNING', '2027-01-05T06:00:00Z', 5000, 2100, 4, null, 'MANUAL');

select results_eq(
  $$ select name from public.roles order by name $$,
  $$ values ('ADMIN'::text), ('ATHLETE'::text), ('COACH'::text) $$,
  'M1 role codes remain ADMIN, ATHLETE, and COACH'
);

set local role anon;
select pg_temp.throws_any_ok($$ select * from public.training_claims $$, 'anonymous cannot select claims');
select pg_temp.throws_any_ok($$ insert into public.training_claims (athlete_id, prescription_id) values ('71000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001') $$, 'anonymous cannot insert claims');
select pg_temp.throws_any_ok($$ select * from public.claim_activities $$, 'anonymous cannot access claim activities');
select pg_temp.throws_any_ok($$ select public.submit_training_claim('78000000-0000-0000-0000-000000000001') $$, 'anonymous cannot execute submission RPC');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select lives_ok($$
  select set_config(
    'test.normal_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000001',
      array['77000000-0000-0000-0000-000000000001']::uuid[],
      'Normal evidence'
    )::text,
    true
  )
$$, 'Athlete A can atomically create an eligible own draft');

select is((select status from public.training_claims where id = current_setting('test.normal_claim')::uuid), 'DRAFT', 'new claim starts as DRAFT');
select is((select count(*) from public.claim_activities where claim_id = current_setting('test.normal_claim')::uuid), 1::bigint, 'atomic draft includes selected evidence');
select pg_temp.throws_any_ok($$ insert into public.claim_activities (claim_id, activity_id) values (current_setting('test.normal_claim')::uuid, '77000000-0000-0000-0000-000000000001') $$, 'duplicate Activity inside one Claim is rejected');
select pg_temp.throws_any_ok($$ update public.claim_activities set activity_id = '77000000-0000-0000-0000-000000000006' where claim_id = current_setting('test.normal_claim')::uuid $$, 'junction relationships cannot be updated in place');

select pg_temp.throws_any_ok($$
  insert into public.training_claims (athlete_id, prescription_id)
  values ('71000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000001')
$$, 'Athlete A cannot spoof Athlete B ownership');
select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000009',
    array['77000000-0000-0000-0000-000000000001']::uuid[], null
  )
$$, 'Athlete A cannot claim Athlete B prescription');
select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000010',
    array['77000000-0000-0000-0000-000000000006']::uuid[], null
  )
$$, 'Athlete A cannot claim an unpublished program prescription');

select lives_ok($$ update public.training_claims set athlete_note = 'Updated draft note' where id = current_setting('test.normal_claim')::uuid $$, 'Athlete A can edit own draft claim note');
select is((select athlete_note from public.training_claims where id = current_setting('test.normal_claim')::uuid), 'Updated draft note', 'draft claim note update persists');
select pg_temp.throws_any_ok($$ update public.training_claims set athlete_note = repeat('x', 4001) where id = current_setting('test.normal_claim')::uuid $$, 'database rejects an oversized Claim Note');
select pg_temp.throws_any_ok($$ update public.training_claims set athlete_id = '71000000-0000-0000-0000-000000000002' where id = current_setting('test.normal_claim')::uuid $$, 'client cannot change claim athlete_id');
select pg_temp.throws_any_ok($$ update public.training_claims set prescription_id = '76000000-0000-0000-0000-000000000002' where id = current_setting('test.normal_claim')::uuid $$, 'client cannot change claim prescription_id');
select pg_temp.throws_any_ok($$ update public.training_claims set status = 'SUBMITTED' where id = current_setting('test.normal_claim')::uuid $$, 'client cannot spoof submitted status');
select pg_temp.throws_any_ok($$ update public.training_claims set submitted_at = now() where id = current_setting('test.normal_claim')::uuid $$, 'client cannot set submitted_at');

select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000006',
    array['77000000-0000-0000-0000-000000000006','77000000-0000-0000-0000-000000000006']::uuid[],
    null
  )
$$, 'atomic draft rejects duplicate Activity IDs');
select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000006',
    array['77000000-0000-0000-0000-000000000006','77000000-0000-0000-0000-000000000009']::uuid[],
    'Must roll back'
  )
$$, 'atomic draft rejects a valid plus cross-athlete evidence set');
select is((select count(*) from public.training_claims where prescription_id = '76000000-0000-0000-0000-000000000006'), 0::bigint, 'failed atomic draft leaves no claim');
select is((select count(*) from public.claim_activities where activity_id = '77000000-0000-0000-0000-000000000006'), 0::bigint, 'failed atomic draft leaves no evidence link');

insert into public.training_claims (athlete_id, prescription_id)
values ('71000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000005');
select set_config('test.zero_claim', (select id::text from public.training_claims where prescription_id = '76000000-0000-0000-0000-000000000005'), true);
select is((select status from public.training_claims where id = current_setting('test.zero_claim')::uuid), 'DRAFT', 'zero-evidence DRAFT may exist');
select pg_temp.throws_any_ok($$ select public.submit_training_claim(current_setting('test.zero_claim')::uuid) $$, 'zero-evidence claim cannot be submitted');
select pg_temp.throws_any_ok($$
  insert into public.claim_activities (claim_id, activity_id)
  values (current_setting('test.zero_claim')::uuid, '77000000-0000-0000-0000-000000000009')
$$, 'Athlete A cannot attach Athlete B activity');

select lives_ok($$ select public.submit_training_claim(current_setting('test.normal_claim')::uuid) $$, 'normal claim submission succeeds');
select ok((select status = 'SUBMITTED' and submitted_at is not null from public.training_claims where id = current_setting('test.normal_claim')::uuid), 'submission atomically sets status and submitted_at');
select pg_temp.throws_any_ok($$ insert into public.claim_activities (claim_id, activity_id) values (current_setting('test.normal_claim')::uuid, '77000000-0000-0000-0000-000000000006') $$, 'evidence cannot be attached to submitted claim');
delete from public.claim_activities where claim_id = current_setting('test.normal_claim')::uuid;
select is((select count(*) from public.claim_activities where claim_id = current_setting('test.normal_claim')::uuid), 1::bigint, 'submitted evidence removal attempt changes no rows');
delete from public.training_claims where id = current_setting('test.normal_claim')::uuid;
select is((select status from public.training_claims where id = current_setting('test.normal_claim')::uuid), 'SUBMITTED', 'submitted Claim deletion attempt changes no rows');
update public.training_claims set athlete_note = 'tamper' where id = current_setting('test.normal_claim')::uuid;
select is((select athlete_note from public.training_claims where id = current_setting('test.normal_claim')::uuid), 'Updated draft note', 'submitted Claim update attempt changes no rows');
select pg_temp.throws_any_ok($$ update public.activities set distance_m = 14000 where id = '77000000-0000-0000-0000-000000000001' $$, 'submitted evidence cannot be updated');
select pg_temp.throws_any_ok($$ delete from public.activities where id = '77000000-0000-0000-0000-000000000001' $$, 'submitted evidence cannot be deleted');
select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000006',
    array['77000000-0000-0000-0000-000000000001']::uuid[], null
  )
$$, 'same Activity cannot be used in a second Claim');
select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000001',
    array['77000000-0000-0000-0000-000000000006']::uuid[], null
  )
$$, 'one Claim per Prescription rejects a second Claim after submission');

select lives_ok($$
  select set_config(
    'test.multi_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000002',
      array['77000000-0000-0000-0000-000000000002','77000000-0000-0000-0000-000000000003']::uuid[], null
    )::text,
    true
  )
$$, 'one Claim accepts multiple Activities');
select is((select count(*) from public.claim_activities where claim_id = current_setting('test.multi_claim')::uuid), 2::bigint, 'multi-activity claim stores two evidence rows');
select lives_ok($$ select public.submit_training_claim(current_setting('test.multi_claim')::uuid) $$, 'multi-activity claim submits');
select is((select status from public.training_claims where id = current_setting('test.multi_claim')::uuid), 'SUBMITTED', 'multi-activity result is SUBMITTED only');
select pg_temp.throws_any_ok($$ update public.activities set duration_sec = duration_sec + 1 where id in ('77000000-0000-0000-0000-000000000002','77000000-0000-0000-0000-000000000003') $$, 'all submitted multi-activity evidence is immutable');

select lives_ok($$
  select set_config(
    'test.short_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000003',
      array['77000000-0000-0000-0000-000000000004']::uuid[],
      'Stopped early because I was not feeling well.'
    )::text,
    true
  )
$$, 'short evidence may form a Claim without validation');
select lives_ok($$ select public.submit_training_claim(current_setting('test.short_claim')::uuid) $$, 'short evidence submits structurally');
select is((select status from public.training_claims where id = current_setting('test.short_claim')::uuid), 'SUBMITTED', 'short claim has no PARTIAL or rejection outcome');

select lives_ok($$
  select set_config(
    'test.alternative_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000004',
      array['77000000-0000-0000-0000-000000000005']::uuid[],
      'Used Padel as replacement activity.'
    )::text,
    true
  )
$$, 'alternative sport may form a Claim');
select lives_ok($$ select public.submit_training_claim(current_setting('test.alternative_claim')::uuid) $$, 'alternative sport submits structurally');
select is((select status from public.training_claims where id = current_setting('test.alternative_claim')::uuid), 'SUBMITTED', 'alternative sport receives no validation outcome');

select lives_ok($$
  select set_config(
    'test.release_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000007',
      array['77000000-0000-0000-0000-000000000007']::uuid[], null
    )::text,
    true
  )
$$, 'draft Claim can reserve an Activity');
select lives_ok($$ update public.activities set name = 'Draft evidence edited' where id = '77000000-0000-0000-0000-000000000007' $$, 'Activity used only by DRAFT remains editable');
select pg_temp.throws_any_ok($$
  select public.create_training_claim_draft(
    '76000000-0000-0000-0000-000000000008',
    array['77000000-0000-0000-0000-000000000007']::uuid[], null
  )
$$, 'draft Activity cannot be double-claimed');
select lives_ok($$ select public.delete_training_claim_draft(current_setting('test.release_claim')::uuid) $$, 'athlete can delete own draft');
select lives_ok($$
  select set_config(
    'test.recreated_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000008',
      array['77000000-0000-0000-0000-000000000007']::uuid[], null
    )::text,
    true
  )
$$, 'deleting a draft releases its Activity for another Claim');
select is((select count(*) from public.training_claims where prescription_id = '76000000-0000-0000-0000-000000000007'), 0::bigint, 'deleted draft releases its Prescription for a future Claim');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true);
select lives_ok($$
  select set_config(
    'test.athlete_b_claim',
    public.create_training_claim_draft(
      '76000000-0000-0000-0000-000000000009',
      array['77000000-0000-0000-0000-000000000009']::uuid[], null
    )::text,
    true
  )
$$, 'Athlete B can create their own Claim');
select is((select count(*) from public.training_claims where athlete_id = '71000000-0000-0000-0000-000000000001'), 0::bigint, 'Athlete B cannot read Athlete A Claims');
select is((select count(*) from public.claim_activities where activity_id <> '77000000-0000-0000-0000-000000000009'), 0::bigint, 'Athlete B cannot inspect Athlete A claim evidence');
select pg_temp.throws_any_ok($$ select public.submit_training_claim(current_setting('test.normal_claim')::uuid) $$, 'Athlete B cannot submit Athlete A Claim');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000003', true);
select ok(
  (select count(*) > 0 and bool_and(status = 'SUBMITTED') from public.training_claims),
  'M6 exposes only submitted Claims from Programs authored by this COACH'
);
reset role;

select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity)
   from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'public' and relname in ('training_claims', 'claim_activities')),
  'Claim tables use forced RLS'
);
select ok(
  (select prosecdef and coalesce(array_to_string(proconfig, ','), '') = 'search_path=""'
   from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where nspname = 'public' and proname = 'submit_training_claim'),
  'submission is SECURITY DEFINER with an empty search_path'
);
select ok(
  (select prosecdef and coalesce(array_to_string(proconfig, ','), '') = 'search_path=""'
   from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where nspname = 'public' and proname = 'protect_submitted_activity_evidence')
  and not has_function_privilege('authenticated', 'public.protect_submitted_activity_evidence()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.protect_submitted_activity_evidence()', 'EXECUTE'),
  'Activity immutability trigger is a non-callable SECURITY DEFINER with an empty search_path'
);
select ok(
  not has_function_privilege('anon', 'public.submit_training_claim(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.submit_training_claim(uuid)', 'EXECUTE'),
  'submission RPC is executable only by authenticated clients'
);
select ok(
  not has_column_privilege('authenticated', 'public.training_claims', 'status', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.training_claims', 'submitted_at', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.training_claims', 'athlete_id', 'UPDATE')
  and has_column_privilege('authenticated', 'public.training_claims', 'athlete_note', 'UPDATE'),
  'column grants allow only draft note updates from clients'
);
select is(
  (select count(*) from information_schema.check_constraints
   where constraint_schema = 'public'
     and constraint_name = 'training_claims_status_check'
     and check_clause similar to '%(DRAFT|SUBMITTED)%'),
  1::bigint,
  'M5 exposes only DRAFT and SUBMITTED claim statuses'
);
select is(to_regclass('public.validations'), null::regclass, 'M6 validation tables remain unimplemented');

select * from finish();
rollback;
