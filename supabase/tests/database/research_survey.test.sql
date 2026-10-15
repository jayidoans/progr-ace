begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

delete from public.research_survey_responses
where participant_user_id in ('f1900000-0000-4000-8000-000000000001', 'f1900000-0000-4000-8000-000000000002', 'f1900000-0000-4000-8000-000000000003', 'f1900000-0000-4000-8000-000000000004', 'f1900000-0000-4000-8000-000000000005');
update public.research_survey_campaigns set is_open = true, closes_at = now() + interval '7 days' where survey_version = 'PROGRACE_RESEARCH_2026_V1';

insert into auth.users (id, email, raw_user_meta_data) values
  ('f1900000-0000-4000-8000-000000000001', 'survey-athlete@example.test', '{"full_name":"Survey Athlete"}'),
  ('f1900000-0000-4000-8000-000000000002', 'survey-other@example.test', '{"full_name":"Other Athlete"}'),
  ('f1900000-0000-4000-8000-000000000003', 'survey-coach@example.test', '{"full_name":"Survey Coach"}'),
  ('f1900000-0000-4000-8000-000000000004', 'survey-admin@example.test', '{"full_name":"Survey Admin"}'),
  ('f1900000-0000-4000-8000-000000000005', 'survey-member@example.test', '{"full_name":"Survey Member"}')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role_id)
select assignments.user_id, roles.id from (values
  ('f1900000-0000-4000-8000-000000000001'::uuid, 'ATHLETE'),
  ('f1900000-0000-4000-8000-000000000002'::uuid, 'ATHLETE'),
  ('f1900000-0000-4000-8000-000000000003'::uuid, 'COACH'),
  ('f1900000-0000-4000-8000-000000000004'::uuid, 'ADMIN')
) assignments(user_id, role_name) join public.roles on roles.name = assignments.role_name
on conflict (user_id, role_id) do nothing;

delete from public.user_roles
where user_id in ('f1900000-0000-4000-8000-000000000003', 'f1900000-0000-4000-8000-000000000005')
  and role_id = (select id from public.roles where name = 'ATHLETE');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1900000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.submit_research_survey_response(3,3,3,3,3,3,3,3,3,3, 4,4,4, 5,4,3, 2,3,4, true, 'PROGRACE_RESEARCH_2026_V1')$$, 'Athlete submits final survey response');
select is((select sus_score from public.research_survey_responses where participant_user_id = auth.uid()), 50::numeric, 'standard SUS score is calculated server-side');
select is((select tm_mean from public.research_survey_responses where participant_user_id = auth.uid()), 4::numeric, 'TM mean is independently calculated');
select is((select count(*) from public.research_survey_responses), 1::bigint, 'Athlete reads only own response');
select throws_ok($$select public.submit_research_survey_response(3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,true,'PROGRACE_RESEARCH_2026_V1')$$, '23505', null, 'duplicate survey is rejected atomically');
select throws_ok($$update public.research_survey_responses set sus01 = 1$$, null, null, 'Athlete cannot modify final response');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1900000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.research_survey_responses), 0::bigint, 'Another Athlete cannot read response');
select throws_ok($$insert into public.research_survey_responses (participant_user_id, sus01,sus02,sus03,sus04,sus05,sus06,sus07,sus08,sus09,sus10,tm01,tm02,tm03,ev01,ev02,ev03,ac01,ac02,ac03,sus_score,tm_mean,ev_mean,ac_mean,consent_given,consent_version) values (auth.uid(),1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,true,'PROGRACE_RESEARCH_2026_V1')$$, null, null, 'Direct client insert is rejected');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1900000-0000-4000-8000-000000000003', true);
select lives_ok($$select public.submit_research_survey_response(3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,true,'PROGRACE_RESEARCH_2026_V1')$$, 'Coach can submit');
select throws_ok($$select * from public.export_research_survey_responses()$$, '42501', null, 'Non-Admin cannot export');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1900000-0000-4000-8000-000000000004', true);
select ok(exists (select 1 from public.export_research_survey_responses() where participant_id = md5('f1900000-0000-4000-8000-000000000001:PROGRACE_RESEARCH_2026_V1')), 'Admin can export responses');
select is((select participant_id from public.export_research_survey_responses() limit 1) like '%@%', false, 'Export uses pseudonymous identifier only');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1900000-0000-4000-8000-000000000005', true);
select lives_ok($$select public.submit_research_survey_response(3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,true,'PROGRACE_RESEARCH_2026_V1')$$, 'Authenticated user without an application role can submit');
reset role;

select * from finish();
rollback;
