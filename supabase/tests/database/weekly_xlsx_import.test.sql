begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.denied(p_sql text, p_description text)
returns text language plpgsql as $$
begin execute p_sql; return extensions.ok(false, p_description);
exception when others then return extensions.ok(true, p_description); end;
$$;

create function pg_temp.week_payload(
  p_week_number integer,
  p_start date,
  p_end date,
  p_invalid_component boolean default false
) returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'week_number', p_week_number,
    'phase', 'Imported Build',
    'start_date', p_start,
    'end_date', p_end,
    'prescriptions', jsonb_build_array(
      jsonb_build_object(
        'training_menu', 'EASY',
        'scheduled_date', p_start + 1,
        'title', 'Imported Easy Run',
        'description', 'Weekly XLSX session',
        'components', jsonb_build_array(jsonb_build_object(
          'component_type', 'EASY',
          'target_distance_m', 6000,
          'instruction', 'Comfortable effort'
        ))
      ),
      jsonb_build_object(
        'training_menu', 'SPEED',
        'scheduled_date', p_start + 3,
        'title', 'Imported Speed',
        'description', null,
        'components', jsonb_build_array(jsonb_build_object(
          'component_type', case when p_invalid_component then 'UNSUPPORTED' else 'INTERVAL' end,
          'repetitions', 6,
          'distance_per_rep_m', 400
        ))
      )
    )
  );
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('f1100000-0000-4000-8000-000000000001', 'weekly-import-coach@example.test', '{"full_name":"Weekly Import Coach"}'),
  ('f1100000-0000-4000-8000-000000000002', 'weekly-import-athlete@example.test', '{"full_name":"Weekly Import Athlete"}'),
  ('f1100000-0000-4000-8000-000000000003', 'weekly-import-other@example.test', '{"full_name":"Unrelated Coach"}'),
  ('f1100000-0000-4000-8000-000000000004', 'weekly-import-admin@example.test', '{"full_name":"Weekly Import Admin"}');
insert into public.user_roles (user_id, role_id)
select 'f1100000-0000-4000-8000-000000000001', id from public.roles where name='COACH';
insert into public.user_roles (user_id, role_id)
select 'f1100000-0000-4000-8000-000000000003', id from public.roles where name='COACH';
insert into public.user_roles (user_id, role_id)
select 'f1100000-0000-4000-8000-000000000004', id from public.roles where name='ADMIN';

insert into public.races (id, name, event_date, distance_m)
values ('f1200000-0000-4000-8000-000000000001', 'Weekly Import Race', current_date + 90, 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status)
values ('f1300000-0000-4000-8000-000000000001', 'f1100000-0000-4000-8000-000000000002', 'f1200000-0000-4000-8000-000000000001', 14400, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by, status)
values (
  'f1400000-0000-4000-8000-000000000001',
  'f1300000-0000-4000-8000-000000000001',
  'Weekly Import Program',
  date_trunc('week', current_date)::date,
  date_trunc('week', current_date)::date + 27,
  'f1100000-0000-4000-8000-000000000001',
  'PUBLISHED'
);
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status) values
  ('f1500000-0000-4000-8000-000000000001', 'f1400000-0000-4000-8000-000000000001', 1, 'Weekly plan', date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6, 'DRAFT'),
  ('f1500000-0000-4000-8000-000000000002', 'f1400000-0000-4000-8000-000000000001', 2, 'Weekly plan', date_trunc('week', current_date)::date + 7, date_trunc('week', current_date)::date + 13, 'DRAFT'),
  ('f1500000-0000-4000-8000-000000000003', 'f1400000-0000-4000-8000-000000000001', 3, 'Published', date_trunc('week', current_date)::date + 14, date_trunc('week', current_date)::date + 20, 'PUBLISHED'),
  ('f1500000-0000-4000-8000-000000000004', 'f1400000-0000-4000-8000-000000000001', 4, 'Weekly plan', date_trunc('week', current_date)::date + 21, date_trunc('week', current_date)::date + 27, 'DRAFT');

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000001',
  pg_temp.week_payload(1, date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6)::text
), 'unauthenticated caller cannot import a weekly workbook');

select set_config('request.jwt.claim.sub', 'f1100000-0000-4000-8000-000000000002', true);
select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000001',
  pg_temp.week_payload(1, date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6)::text
), 'Athlete cannot import a weekly workbook');

select set_config('request.jwt.claim.sub', 'f1100000-0000-4000-8000-000000000003', true);
select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000001',
  pg_temp.week_payload(1, date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6)::text
), 'unrelated Coach cannot import into another Coach program');

select set_config('request.jwt.claim.sub', 'f1100000-0000-4000-8000-000000000001', true);
select is(public.import_draft_training_week(
  'f1500000-0000-4000-8000-000000000001',
  pg_temp.week_payload(1, date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6)
), 2, 'owning Coach atomically imports all weekly sessions');
select is((select count(*) from public.training_prescriptions where training_week_id='f1500000-0000-4000-8000-000000000001'), 2::bigint, 'weekly import creates the expected Prescriptions');
select is((select count(*) from public.prescription_components component join public.training_prescriptions prescription on prescription.id=component.prescription_id where prescription.training_week_id='f1500000-0000-4000-8000-000000000001'), 2::bigint, 'weekly import creates ordered component data');
select is((select phase from public.training_weeks where id='f1500000-0000-4000-8000-000000000001'), 'Imported Build', 'weekly import applies the workbook phase to the draft week');
select is((select planning_status from public.training_weeks where id='f1500000-0000-4000-8000-000000000001'), 'DRAFT', 'weekly import does not publish the week automatically');
select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000001',
  pg_temp.week_payload(1, date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6)::text
), 'duplicate import cannot append duplicate sessions to a non-empty draft week');

select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000002',
  pg_temp.week_payload(9, date_trunc('week', current_date)::date + 7, date_trunc('week', current_date)::date + 13)::text
), 'workbook week identity must match the selected week');
select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000003',
  pg_temp.week_payload(3, date_trunc('week', current_date)::date + 14, date_trunc('week', current_date)::date + 20)::text
), 'weekly workbook cannot import into a PUBLISHED week');
select pg_temp.denied(format(
  'select public.import_draft_training_week(%L, %L::jsonb)',
  'f1500000-0000-4000-8000-000000000004',
  pg_temp.week_payload(4, date_trunc('week', current_date)::date + 21, date_trunc('week', current_date)::date + 27, true)::text
), 'invalid component makes the entire weekly import fail');

reset role;
select is((select count(*) from public.training_prescriptions where training_week_id='f1500000-0000-4000-8000-000000000004'), 0::bigint, 'failed weekly import leaves no partial Prescription data');
select is((select phase from public.training_weeks where id='f1500000-0000-4000-8000-000000000004'), 'Weekly plan', 'failed weekly import rolls back the phase change');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1100000-0000-4000-8000-000000000004', true);
select is(public.import_draft_training_week(
  'f1500000-0000-4000-8000-000000000002',
  pg_temp.week_payload(2, date_trunc('week', current_date)::date + 7, date_trunc('week', current_date)::date + 13)
), 2, 'actual ADMIN retains appropriate weekly import access');

reset role;
select * from finish();
rollback;
