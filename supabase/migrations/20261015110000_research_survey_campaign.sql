begin;

-- The first survey migration is already deployed. Keep its responses intact while
-- making the respondent role-neutral and adding an administrator-controlled campaign.
alter table public.research_survey_responses rename column athlete_user_id to participant_user_id;
alter table public.research_survey_responses rename constraint research_survey_responses_athlete_user_id_survey_version_key to research_survey_responses_participant_user_id_survey_version_key;
alter table public.research_survey_responses rename constraint research_survey_responses_athlete_user_id_fkey to research_survey_responses_participant_user_id_fkey;

drop policy if exists "research_survey_responses_select_own" on public.research_survey_responses;
create policy "research_survey_responses_select_own" on public.research_survey_responses
for select to authenticated using (participant_user_id = (select auth.uid()));

create table public.research_survey_campaigns (
  survey_version text primary key check (survey_version = 'PROGRACE_RESEARCH_2026_V1'),
  is_open boolean not null default false,
  closes_at timestamptz,
  opening_id uuid not null default gen_random_uuid(),
  opened_at timestamptz,
  opened_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.research_survey_campaigns (survey_version) values ('PROGRACE_RESEARCH_2026_V1');

alter table public.research_survey_campaigns enable row level security;
alter table public.research_survey_campaigns force row level security;
revoke all on public.research_survey_campaigns from public, anon, authenticated;
grant select on public.research_survey_campaigns to authenticated;
create policy "research_survey_campaigns_select_authenticated" on public.research_survey_campaigns
for select to authenticated using ((select auth.uid()) is not null);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'CLAIM_SUBMITTED', 'CLAIM_REVIEWED', 'PROGRAM_CANCELLATION_REQUESTED',
  'PROGRAM_CANCELLATION_DECIDED', 'PROGRAM_PUBLISHED', 'WEEKLY_PLAN_PUBLISHED',
  'RESEARCH_SURVEY_AVAILABLE'
));
alter table public.notifications drop constraint if exists notifications_target_path_check;
alter table public.notifications add constraint notifications_target_path_check check (
  target_path is null or target_path = '/survey' or target_path ~ '^/dashboard(/[a-zA-Z0-9_-]+)*$'
);

create or replace function public.submit_research_survey_response(
  p_sus01 integer, p_sus02 integer, p_sus03 integer, p_sus04 integer, p_sus05 integer,
  p_sus06 integer, p_sus07 integer, p_sus08 integer, p_sus09 integer, p_sus10 integer,
  p_tm01 integer, p_tm02 integer, p_tm03 integer,
  p_ev01 integer, p_ev02 integer, p_ev03 integer,
  p_ac01 integer, p_ac02 integer, p_ac03 integer,
  p_consent_given boolean, p_consent_version text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare response_id uuid; sus numeric(5,2); tm numeric(3,2); ev numeric(3,2); ac numeric(3,2);
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not (public.has_role('ATHLETE') or public.has_role('COACH')) then
    raise exception 'Athlete or Coach access is required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.research_survey_campaigns
    where survey_version = p_consent_version and is_open and closes_at is not null and closes_at > now()) then
    raise exception 'Survey is not currently open' using errcode = '42501';
  end if;
  if p_consent_given is not true or p_consent_version <> 'PROGRACE_RESEARCH_2026_V1' then raise exception 'Research consent is required' using errcode = '22023'; end if;
  if not (p_sus01 between 1 and 5 and p_sus02 between 1 and 5 and p_sus03 between 1 and 5 and p_sus04 between 1 and 5 and p_sus05 between 1 and 5 and p_sus06 between 1 and 5 and p_sus07 between 1 and 5 and p_sus08 between 1 and 5 and p_sus09 between 1 and 5 and p_sus10 between 1 and 5 and p_tm01 between 1 and 5 and p_tm02 between 1 and 5 and p_tm03 between 1 and 5 and p_ev01 between 1 and 5 and p_ev02 between 1 and 5 and p_ev03 between 1 and 5 and p_ac01 between 1 and 5 and p_ac02 between 1 and 5 and p_ac03 between 1 and 5) then raise exception 'Survey answers must be between 1 and 5' using errcode = '22023'; end if;
  sus := ((p_sus01 - 1) + (5 - p_sus02) + (p_sus03 - 1) + (5 - p_sus04) + (p_sus05 - 1) + (5 - p_sus06) + (p_sus07 - 1) + (5 - p_sus08) + (p_sus09 - 1) + (5 - p_sus10)) * 2.5;
  tm := (p_tm01 + p_tm02 + p_tm03)::numeric / 3; ev := (p_ev01 + p_ev02 + p_ev03)::numeric / 3; ac := (p_ac01 + p_ac02 + p_ac03)::numeric / 3;
  insert into public.research_survey_responses (participant_user_id, sus01, sus02, sus03, sus04, sus05, sus06, sus07, sus08, sus09, sus10, tm01, tm02, tm03, ev01, ev02, ev03, ac01, ac02, ac03, sus_score, tm_mean, ev_mean, ac_mean, consent_given, consent_version)
  values (auth.uid(), p_sus01,p_sus02,p_sus03,p_sus04,p_sus05,p_sus06,p_sus07,p_sus08,p_sus09,p_sus10,p_tm01,p_tm02,p_tm03,p_ev01,p_ev02,p_ev03,p_ac01,p_ac02,p_ac03,sus,tm,ev,ac,true,p_consent_version) returning id into response_id;
  return response_id;
end; $$;

create or replace function public.set_research_survey_campaign(p_is_open boolean, p_closes_at timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign public.research_survey_campaigns; new_opening_id uuid;
begin
  if auth.uid() is null or not public.has_role('ADMIN') then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if p_is_open and (p_closes_at is null or p_closes_at <= now()) then raise exception 'A future closing date is required to open the survey' using errcode = '22023'; end if;
  select * into campaign from public.research_survey_campaigns where survey_version = 'PROGRACE_RESEARCH_2026_V1' for update;
  new_opening_id := case when p_is_open and not campaign.is_open then gen_random_uuid() else campaign.opening_id end;
  update public.research_survey_campaigns set is_open = p_is_open, closes_at = p_closes_at, opening_id = new_opening_id,
    opened_at = case when p_is_open and not campaign.is_open then now() else opened_at end,
    opened_by = case when p_is_open and not campaign.is_open then auth.uid() else opened_by end, updated_at = now()
  where survey_version = campaign.survey_version;
  if p_is_open and not campaign.is_open then
    insert into public.notifications (recipient_user_id, type, event_key, title, body, target_path)
    select distinct user_role.user_id, 'RESEARCH_SURVEY_AVAILABLE',
      'research-survey-available:' || new_opening_id || ':' || user_role.user_id,
      'Research survey is available', 'Please complete the ProgrACE research survey before it closes.', '/survey'
    from public.user_roles user_role join public.roles role on role.id = user_role.role_id
    where role.name in ('ATHLETE', 'COACH')
    on conflict (event_key) do nothing;
  end if;
end; $$;

revoke all on function public.set_research_survey_campaign(boolean, timestamptz) from public, anon;
grant execute on function public.set_research_survey_campaign(boolean, timestamptz) to authenticated;

create or replace function public.export_research_survey_responses()
returns table (participant_id text, survey_version text, submitted_at timestamptz, sus01 smallint, sus02 smallint, sus03 smallint, sus04 smallint, sus05 smallint, sus06 smallint, sus07 smallint, sus08 smallint, sus09 smallint, sus10 smallint, tm01 smallint, tm02 smallint, tm03 smallint, ev01 smallint, ev02 smallint, ev03 smallint, ac01 smallint, ac02 smallint, ac03 smallint, sus_score numeric, tm_mean numeric, ev_mean numeric, ac_mean numeric) language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_role('ADMIN') then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return query select md5(response.participant_user_id::text || ':PROGRACE_RESEARCH_2026_V1'), response.survey_version, response.submitted_at, response.sus01,response.sus02,response.sus03,response.sus04,response.sus05,response.sus06,response.sus07,response.sus08,response.sus09,response.sus10,response.tm01,response.tm02,response.tm03,response.ev01,response.ev02,response.ev03,response.ac01,response.ac02,response.ac03,response.sus_score,response.tm_mean,response.ev_mean,response.ac_mean from public.research_survey_responses response order by response.submitted_at asc;
end; $$;

commit;
