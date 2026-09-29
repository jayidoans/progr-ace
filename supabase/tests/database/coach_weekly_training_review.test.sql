begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create function pg_temp.throws_any_ok(p_sql text, p_description text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return extensions.ok(false, p_description);
exception when others then
  return extensions.ok(true, p_description);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('f2700000-0000-4000-8000-000000000001', 'review-athlete@example.test', '{"full_name":"Review Athlete"}'),
  ('f2700000-0000-4000-8000-000000000002', 'review-coach@example.test', '{"full_name":"Review Coach"}'),
  ('f2700000-0000-4000-8000-000000000003', 'other-coach@example.test', '{"full_name":"Other Coach"}'),
  ('f2700000-0000-4000-8000-000000000004', 'review-admin@example.test', '{"full_name":"Review Admin"}');

insert into public.user_roles (user_id, role_id)
select actor, roles.id from (values
  ('f2700000-0000-4000-8000-000000000002'::uuid, 'COACH'),
  ('f2700000-0000-4000-8000-000000000003'::uuid, 'COACH'),
  ('f2700000-0000-4000-8000-000000000004'::uuid, 'ADMIN')
) assignments(actor, role_name) join public.roles on roles.name = assignments.role_name;

insert into public.races (id, name, event_date, distance_m) values
  ('f2710000-0000-4000-8000-000000000001', 'Review Race', current_date + 30, 42195);
insert into public.athlete_race_goals (id, athlete_id, race_id, target_finish_time_sec, status) values
  ('f2720000-0000-4000-8000-000000000001', 'f2700000-0000-4000-8000-000000000001', 'f2710000-0000-4000-8000-000000000001', 15000, 'ACTIVE');
insert into public.training_programs (id, race_goal_id, name, start_date, end_date, created_by, status) values
  ('f2730000-0000-4000-8000-000000000001', 'f2720000-0000-4000-8000-000000000001', 'Current review', date_trunc('week', current_date)::date - 7, date_trunc('week', current_date)::date + 13, 'f2700000-0000-4000-8000-000000000002', 'PUBLISHED');
insert into public.training_weeks (id, training_program_id, week_number, phase, start_date, end_date, planning_status) values
  ('f2740000-0000-4000-8000-000000000003', 'f2730000-0000-4000-8000-000000000001', 1, 'Base', date_trunc('week', current_date)::date - 7, date_trunc('week', current_date)::date - 1, 'PUBLISHED'),
  ('f2740000-0000-4000-8000-000000000001', 'f2730000-0000-4000-8000-000000000001', 2, 'Build', date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6, 'PUBLISHED'),
  ('f2740000-0000-4000-8000-000000000002', 'f2730000-0000-4000-8000-000000000001', 3, 'Build', date_trunc('week', current_date)::date + 7, date_trunc('week', current_date)::date + 13, 'PUBLISHED');
insert into public.training_prescriptions (id, training_week_id, training_menu, scheduled_date, title) values
  ('f2750000-0000-4000-8000-000000000003', 'f2740000-0000-4000-8000-000000000003', 'EASY', date_trunc('week', current_date)::date - 1, 'Historical easy run'),
  ('f2750000-0000-4000-8000-000000000001', 'f2740000-0000-4000-8000-000000000001', 'LONG', current_date, 'Current long run'),
  ('f2750000-0000-4000-8000-000000000002', 'f2740000-0000-4000-8000-000000000002', 'EASY', date_trunc('week', current_date)::date + 8, 'Future easy run');
insert into public.activities (id, athlete_id, name, sport_type, started_at, distance_m, duration_sec, source) values
  ('f2760000-0000-4000-8000-000000000003', 'f2700000-0000-4000-8000-000000000001', 'Historical evidence', 'RUNNING', now() - interval '1 day', 6000, 2100, 'MANUAL'),
  ('f2760000-0000-4000-8000-000000000001', 'f2700000-0000-4000-8000-000000000001', 'Current evidence', 'RUNNING', now(), 20000, 7200, 'MANUAL'),
  ('f2760000-0000-4000-8000-000000000002', 'f2700000-0000-4000-8000-000000000001', 'Future evidence', 'RUNNING', now(), 5000, 1800, 'MANUAL');
insert into public.training_claims (id, athlete_id, prescription_id) values
  ('f2770000-0000-4000-8000-000000000003', 'f2700000-0000-4000-8000-000000000001', 'f2750000-0000-4000-8000-000000000003'),
  ('f2770000-0000-4000-8000-000000000001', 'f2700000-0000-4000-8000-000000000001', 'f2750000-0000-4000-8000-000000000001'),
  ('f2770000-0000-4000-8000-000000000002', 'f2700000-0000-4000-8000-000000000001', 'f2750000-0000-4000-8000-000000000002');
insert into public.claim_activities (id, claim_id, activity_id) values
  ('f2780000-0000-4000-8000-000000000003', 'f2770000-0000-4000-8000-000000000003', 'f2760000-0000-4000-8000-000000000003'),
  ('f2780000-0000-4000-8000-000000000001', 'f2770000-0000-4000-8000-000000000001', 'f2760000-0000-4000-8000-000000000001'),
  ('f2780000-0000-4000-8000-000000000002', 'f2770000-0000-4000-8000-000000000002', 'f2760000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000001', true);
select public.submit_training_claim('f2770000-0000-4000-8000-000000000003');
select public.submit_training_claim('f2770000-0000-4000-8000-000000000001');
select public.submit_training_claim('f2770000-0000-4000-8000-000000000002');
reset role;

set local role anon;
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 8, 'Anonymous')$$, 'anonymous cannot review a week');
select * from pg_temp.throws_any_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000001', 'Anonymous')$$, 'anonymous cannot comment on Activity evidence');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000001', true);
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 8, 'Athlete')$$, 'Athlete cannot create Coach week review');
select * from pg_temp.throws_any_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000001', 'Athlete')$$, 'Athlete cannot create Coach Activity comment');

select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000003', true);
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 8, 'Unrelated')$$, 'unrelated Coach cannot review Program');
select * from pg_temp.throws_any_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000001', 'Unrelated')$$, 'unrelated Coach cannot comment on Program Activity');
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000003', 8, 'Unrelated historical')$$, 'unrelated Coach cannot review historical Program week');
select * from pg_temp.throws_any_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000003', 'Unrelated historical')$$, 'unrelated Coach cannot comment on historical Program Activity');

select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000001', '  Strong controlled finish.  ')$$, 'owning Coach can comment on current-week submitted evidence');
select is((select coach_comment from public.training_activity_comments where claim_activity_id = 'f2780000-0000-4000-8000-000000000001'), 'Strong controlled finish.', 'Activity comment is normalized');
select is((select reviewed_by from public.training_activity_comments where claim_activity_id = 'f2780000-0000-4000-8000-000000000001'), 'f2700000-0000-4000-8000-000000000002'::uuid, 'Activity reviewer comes from auth.uid');
select lives_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 8, '  Good consistency.  ')$$, 'owning Coach can review current published week');
select is((select fulfillment_rating from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000001'), 8::smallint, 'week rating is stored');
select is((select coach_comment from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000001'), 'Good consistency.', 'week comment is normalized');
select lives_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 9, null)$$, 'repeat save updates the single week review');
select is((select count(*) from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000001'), 1::bigint, 'one review exists per week');
select is((select fulfillment_rating from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000001'), 9::smallint, 'week review update replaces rating');
select lives_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000003', '  Strong historical effort.  ')$$, 'owning Coach can comment on past submitted evidence');
select is((select coach_comment from public.training_activity_comments where claim_activity_id = 'f2780000-0000-4000-8000-000000000003'), 'Strong historical effort.', 'historical Activity comment is normalized');
select lives_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000003', 7, '  Good follow-through.  ')$$, 'owning Coach can review past published week');
select is((select fulfillment_rating from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000003'), 7::smallint, 'historical week rating is stored');
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 11, null)$$, 'rating above 10 is rejected');
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', -1, null)$$, 'negative rating is rejected');
select * from pg_temp.throws_any_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000002', 8, 'Future')$$, 'future week cannot be reviewed');
select * from pg_temp.throws_any_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000002', 'Future')$$, 'future week Activity cannot be commented on');
select * from pg_temp.throws_any_ok($$insert into public.training_week_reviews (training_week_id, fulfillment_rating, reviewed_by) values ('f2740000-0000-4000-8000-000000000002', 10, 'f2700000-0000-4000-8000-000000000002')$$, 'direct table write is denied');

select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete can read Coach week feedback for own Program');
select is((select count(*) from public.training_activity_comments where claim_activity_id = 'f2780000-0000-4000-8000-000000000001'), 1::bigint, 'Athlete can read Coach Activity feedback for own Program');
select is((select count(*) from public.training_week_reviews where training_week_id = 'f2740000-0000-4000-8000-000000000003'), 1::bigint, 'Athlete can read historical Coach week feedback for own Program');
select is((select count(*) from public.training_activity_comments where claim_activity_id = 'f2780000-0000-4000-8000-000000000003'), 1::bigint, 'Athlete can read historical Coach Activity feedback for own Program');

select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000004', true);
select lives_ok($$select public.save_training_week_review('f2740000-0000-4000-8000-000000000001', 10, 'Admin review')$$, 'ADMIN retains appropriate review authority');
select lives_ok($$select public.save_training_activity_comment('f2780000-0000-4000-8000-000000000001', 'Admin feedback')$$, 'ADMIN can comment on current evidence');

reset role;
select * from finish();
rollback;
