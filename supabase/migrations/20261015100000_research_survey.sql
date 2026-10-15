begin;

create table public.research_survey_responses (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references public.profiles(id) on delete restrict,
  survey_version text not null default 'PROGRACE_RESEARCH_2026_V1' check (survey_version = 'PROGRACE_RESEARCH_2026_V1'),
  sus01 smallint not null check (sus01 between 1 and 5),
  sus02 smallint not null check (sus02 between 1 and 5),
  sus03 smallint not null check (sus03 between 1 and 5),
  sus04 smallint not null check (sus04 between 1 and 5),
  sus05 smallint not null check (sus05 between 1 and 5),
  sus06 smallint not null check (sus06 between 1 and 5),
  sus07 smallint not null check (sus07 between 1 and 5),
  sus08 smallint not null check (sus08 between 1 and 5),
  sus09 smallint not null check (sus09 between 1 and 5),
  sus10 smallint not null check (sus10 between 1 and 5),
  tm01 smallint not null check (tm01 between 1 and 5),
  tm02 smallint not null check (tm02 between 1 and 5),
  tm03 smallint not null check (tm03 between 1 and 5),
  ev01 smallint not null check (ev01 between 1 and 5),
  ev02 smallint not null check (ev02 between 1 and 5),
  ev03 smallint not null check (ev03 between 1 and 5),
  ac01 smallint not null check (ac01 between 1 and 5),
  ac02 smallint not null check (ac02 between 1 and 5),
  ac03 smallint not null check (ac03 between 1 and 5),
  sus_score numeric(5,2) not null check (sus_score between 0 and 100),
  tm_mean numeric(3,2) not null check (tm_mean between 1 and 5),
  ev_mean numeric(3,2) not null check (ev_mean between 1 and 5),
  ac_mean numeric(3,2) not null check (ac_mean between 1 and 5),
  consent_given boolean not null check (consent_given),
  consent_version text not null check (consent_version = 'PROGRACE_RESEARCH_2026_V1'),
  submitted_at timestamptz not null default now(),
  unique (athlete_user_id, survey_version)
);

create index research_survey_responses_submitted_idx
  on public.research_survey_responses (submitted_at desc);

alter table public.research_survey_responses enable row level security;
alter table public.research_survey_responses force row level security;
revoke all on table public.research_survey_responses from public, anon, authenticated;
grant select on public.research_survey_responses to authenticated;

create policy "research_survey_responses_select_own" on public.research_survey_responses
for select to authenticated
using (athlete_user_id = (select auth.uid()));

create function public.submit_research_survey_response(
  p_sus01 integer, p_sus02 integer, p_sus03 integer, p_sus04 integer, p_sus05 integer,
  p_sus06 integer, p_sus07 integer, p_sus08 integer, p_sus09 integer, p_sus10 integer,
  p_tm01 integer, p_tm02 integer, p_tm03 integer,
  p_ev01 integer, p_ev02 integer, p_ev03 integer,
  p_ac01 integer, p_ac02 integer, p_ac03 integer,
  p_consent_given boolean, p_consent_version text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  response_id uuid;
  sus numeric(5,2);
  tm numeric(3,2);
  ev numeric(3,2);
  ac numeric(3,2);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if not public.has_role('ATHLETE') then
    raise exception 'Athlete access is required' using errcode = '42501';
  end if;
  if p_consent_given is not true or p_consent_version <> 'PROGRACE_RESEARCH_2026_V1' then
    raise exception 'Research consent is required' using errcode = '22023';
  end if;
  if not (p_sus01 between 1 and 5 and p_sus02 between 1 and 5 and p_sus03 between 1 and 5 and p_sus04 between 1 and 5 and p_sus05 between 1 and 5
    and p_sus06 between 1 and 5 and p_sus07 between 1 and 5 and p_sus08 between 1 and 5 and p_sus09 between 1 and 5 and p_sus10 between 1 and 5
    and p_tm01 between 1 and 5 and p_tm02 between 1 and 5 and p_tm03 between 1 and 5
    and p_ev01 between 1 and 5 and p_ev02 between 1 and 5 and p_ev03 between 1 and 5
    and p_ac01 between 1 and 5 and p_ac02 between 1 and 5 and p_ac03 between 1 and 5) then
    raise exception 'Survey answers must be between 1 and 5' using errcode = '22023';
  end if;

  sus := ((p_sus01 - 1) + (5 - p_sus02) + (p_sus03 - 1) + (5 - p_sus04) + (p_sus05 - 1)
    + (5 - p_sus06) + (p_sus07 - 1) + (5 - p_sus08) + (p_sus09 - 1) + (5 - p_sus10)) * 2.5;
  tm := (p_tm01 + p_tm02 + p_tm03)::numeric / 3;
  ev := (p_ev01 + p_ev02 + p_ev03)::numeric / 3;
  ac := (p_ac01 + p_ac02 + p_ac03)::numeric / 3;

  insert into public.research_survey_responses (
    athlete_user_id, sus01, sus02, sus03, sus04, sus05, sus06, sus07, sus08, sus09, sus10,
    tm01, tm02, tm03, ev01, ev02, ev03, ac01, ac02, ac03,
    sus_score, tm_mean, ev_mean, ac_mean, consent_given, consent_version
  ) values (
    auth.uid(), p_sus01, p_sus02, p_sus03, p_sus04, p_sus05, p_sus06, p_sus07, p_sus08, p_sus09, p_sus10,
    p_tm01, p_tm02, p_tm03, p_ev01, p_ev02, p_ev03, p_ac01, p_ac02, p_ac03,
    sus, tm, ev, ac, true, p_consent_version
  ) returning id into response_id;
  return response_id;
end;
$$;

create function public.export_research_survey_responses()
returns table (
  participant_id text, survey_version text, submitted_at timestamptz,
  sus01 smallint, sus02 smallint, sus03 smallint, sus04 smallint, sus05 smallint,
  sus06 smallint, sus07 smallint, sus08 smallint, sus09 smallint, sus10 smallint,
  tm01 smallint, tm02 smallint, tm03 smallint, ev01 smallint, ev02 smallint, ev03 smallint,
  ac01 smallint, ac02 smallint, ac03 smallint, sus_score numeric, tm_mean numeric, ev_mean numeric, ac_mean numeric
) language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_role('ADMIN') then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return query
    select md5(response.athlete_user_id::text || ':PROGRACE_RESEARCH_2026_V1'),
      response.survey_version, response.submitted_at,
      response.sus01, response.sus02, response.sus03, response.sus04, response.sus05,
      response.sus06, response.sus07, response.sus08, response.sus09, response.sus10,
      response.tm01, response.tm02, response.tm03, response.ev01, response.ev02, response.ev03,
      response.ac01, response.ac02, response.ac03, response.sus_score, response.tm_mean, response.ev_mean, response.ac_mean
    from public.research_survey_responses response
    order by response.submitted_at asc;
end;
$$;

revoke all on function public.submit_research_survey_response(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, boolean, text) from public, anon;
revoke all on function public.export_research_survey_responses() from public, anon;
grant execute on function public.submit_research_survey_response(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, boolean, text) to authenticated;
grant execute on function public.export_research_survey_responses() to authenticated;

commit;
