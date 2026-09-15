-- LOCAL DEVELOPMENT ACCOUNTS ONLY.
-- Applied by `supabase db reset`; never use these credentials in production.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@prograce.local', extensions.crypt('ProgrACE123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Local Admin"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'coach@prograce.local', extensions.crypt('ProgrACE123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Local Coach"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'athlete@prograce.local', extensions.crypt('ProgrACE123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Local Athlete A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'athlete-b@prograce.local', extensions.crypt('ProgrACE123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Local Athlete B"}', now(), now(), '', '', '', '')
on conflict (id) do update
set encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  users.id::text,
  users.id,
  jsonb_build_object(
    'sub', users.id::text,
    'email', users.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email', now(), now(), now()
from auth.users as users
where users.id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000003',
  '61000000-0000-4000-8000-000000000004'
)
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    updated_at = excluded.updated_at;

delete from public.user_roles
where user_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000003',
  '61000000-0000-4000-8000-000000000004'
);

insert into public.user_roles (user_id, role_id)
select assignments.user_id, roles.id
from (
  values
    ('61000000-0000-4000-8000-000000000001'::uuid, 'ADMIN'),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'COACH'),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'ATHLETE'),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'ATHLETE')
) as assignments(user_id, role_code)
join public.roles on roles.name = assignments.role_code;

-- Local acceptance fixtures. These deliberately stop before the Claim boundary so
-- the athlete must explicitly select evidence and create/submit a Claim in the UI.
insert into public.races (id, name, event_date, location, distance_m, created_by)
values (
  '62000000-0000-4000-8000-000000000001',
  'ProgrACE Local Half Marathon',
  '2027-02-14',
  'Jakarta',
  21098,
  '61000000-0000-4000-8000-000000000002'
)
on conflict (id) do update
set name = excluded.name,
    event_date = excluded.event_date,
    location = excluded.location,
    distance_m = excluded.distance_m,
    created_by = excluded.created_by;

insert into public.athlete_race_goals (
  id, athlete_id, race_id, target_finish_time_sec, status, notes
)
values (
  '63000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000003',
  '62000000-0000-4000-8000-000000000001',
  7140,
  'ACTIVE',
  'Local Milestone 5 acceptance goal'
)
on conflict (id) do update
set target_finish_time_sec = excluded.target_finish_time_sec,
    notes = excluded.notes;

insert into public.training_programs (
  id, race_goal_id, name, description, start_date, end_date, status, created_by
)
values (
  '64000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001',
  'Milestone 5 Local Training',
  'Local-only program for testing explicit activity claims.',
  '2027-01-04',
  '2027-01-10',
  'PUBLISHED',
  '61000000-0000-4000-8000-000000000002'
)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description;

insert into public.training_weeks (
  id, training_program_id, week_number, phase, start_date, end_date
)
values (
  '65000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000001',
  1,
  'Build',
  '2027-01-04',
  '2027-01-10'
)
on conflict (id) do update set phase = excluded.phase;

insert into public.training_prescriptions (
  id, training_week_id, training_menu, scheduled_date, title, description
)
values
  ('66000000-0000-4000-8000-000000000001', '65000000-0000-4000-8000-000000000001', 'EASY', '2027-01-05', 'Easy Run', 'Easy aerobic running.'),
  ('66000000-0000-4000-8000-000000000002', '65000000-0000-4000-8000-000000000001', 'SPEED', '2027-01-07', 'Speed Session', 'Controlled interval session.'),
  ('66000000-0000-4000-8000-000000000003', '65000000-0000-4000-8000-000000000001', 'LONG', '2027-01-10', 'Long Run', 'Long aerobic run.')
on conflict (id) do update
set title = excluded.title,
    description = excluded.description;

insert into public.prescription_components (
  id, prescription_id, sequence_order, component_type, target_distance_m, repetitions,
  distance_per_rep_m, recovery_duration_sec, instruction
)
values
  ('67000000-0000-4000-8000-000000000001', '66000000-0000-4000-8000-000000000001', 1, 'EASY', 5000, null, null, null, 'Conversational effort'),
  ('67000000-0000-4000-8000-000000000002', '66000000-0000-4000-8000-000000000002', 1, 'INTERVAL', null, 8, 400, 90, 'Controlled repetitions'),
  ('67000000-0000-4000-8000-000000000003', '66000000-0000-4000-8000-000000000003', 1, 'LONG', 16000, null, null, null, 'Easy long-run effort')
on conflict (id) do update set instruction = excluded.instruction;

insert into public.activities (
  id, athlete_id, name, sport_type, started_at, distance_m, duration_sec,
  average_hr_bpm, rpe, notes, source
)
values
  ('68000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000003', 'Morning Easy Run', 'RUNNING', '2027-01-05T06:00:00+07:00', 5100, 2130, 148, 4, 'Comfortable morning run.', 'MANUAL'),
  ('68000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000003', 'Shortened Long Run', 'RUNNING', '2027-01-09T06:00:00+07:00', 7390, 3402, 160, 5, 'Stopped early because I was not feeling well.', 'MANUAL'),
  ('68000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', 'Long Run Part One', 'RUNNING', '2027-01-10T05:30:00+07:00', 10000, 3900, 152, 5, null, 'MANUAL'),
  ('68000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000003', 'Long Run Part Two', 'RUNNING', '2027-01-10T07:00:00+07:00', 6000, 2340, 154, 5, null, 'MANUAL'),
  ('68000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000003', 'Padel Replacement', 'PADEL', '2027-01-07T18:30:00+07:00', null, 5400, 150, 7, 'Replacement activity for the speed session.', 'MANUAL'),
  ('68000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000004', 'Athlete B Private Run', 'RUNNING', '2027-01-05T06:00:00+07:00', 5000, 2100, 145, 4, null, 'MANUAL')
on conflict (id) do update
set name = excluded.name,
    sport_type = excluded.sport_type,
    started_at = excluded.started_at,
    distance_m = excluded.distance_m,
    duration_sec = excluded.duration_sec,
    average_hr_bpm = excluded.average_hr_bpm,
    rpe = excluded.rpe,
    notes = excluded.notes;
