begin;

-- A stored pace cannot be migrated without preserving a redundant derived value.
-- Stop explicitly if legacy data uses it; distance and duration remain authoritative.
do $$
begin
  if exists (select 1 from public.activities where average_pace is not null) then
    raise exception
      'Milestone 4 cannot migrate activities with stored average_pace; resolve those rows explicitly';
  end if;

  if exists (
    select 1
    from public.activities
    where distance_meters < 0
       or duration_seconds < 0
       or average_hr <= 0
  ) then
    raise exception
      'Milestone 4 requires non-negative distance/duration and positive heart rate in existing activities';
  end if;
end;
$$;

alter table public.activities rename column activity_date to started_at;
alter table public.activities rename column distance_meters to distance_m_legacy;
alter table public.activities rename column duration_seconds to duration_sec;
alter table public.activities rename column average_hr to average_hr_bpm;

alter table public.activities
  add column name text,
  add column sport_type text,
  add column distance_m integer,
  add column max_hr_bpm integer,
  add column elevation_gain_m integer,
  add column rpe smallint,
  add column notes text,
  add column raw_data jsonb,
  add column updated_at timestamptz;

update public.activities
set name = coalesce(
      nullif(initcap(replace(trim(activity_type), '_', ' ')), ''),
      'Activity'
    ),
    sport_type = case upper(trim(coalesce(activity_type, 'OTHER')))
      when 'RUNNING' then 'RUNNING'
      when 'RUN' then 'RUNNING'
      when 'STRENGTH' then 'STRENGTH_TRAINING'
      when 'STRENGTH_TRAINING' then 'STRENGTH_TRAINING'
      when 'WALKING' then 'WALKING'
      when 'WALK' then 'WALKING'
      when 'CYCLING' then 'CYCLING'
      when 'RIDE' then 'CYCLING'
      when 'PADEL' then 'PADEL'
      else 'OTHER'
    end,
    distance_m = case
      when distance_m_legacy is null then null
      else round(distance_m_legacy)::integer
    end,
    source = case
      when upper(trim(coalesce(source, ''))) = 'STRAVA'
        or external_activity_id is not null then 'STRAVA'
      else 'MANUAL'
    end,
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(created_at, now());

alter table public.activities
  drop column activity_type,
  drop column distance_m_legacy,
  drop column average_pace,
  alter column name set not null,
  alter column sport_type set not null,
  alter column source set default 'MANUAL',
  alter column source set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint activities_name_not_blank_check
    check (length(trim(name)) > 0),
  add constraint activities_source_check
    check (source in ('MANUAL', 'STRAVA')),
  add constraint activities_sport_type_check
    check (sport_type in (
      'RUNNING',
      'STRENGTH_TRAINING',
      'WALKING',
      'CYCLING',
      'PADEL',
      'OTHER'
    )),
  add constraint activities_distance_m_non_negative_check
    check (distance_m is null or distance_m >= 0),
  add constraint activities_duration_sec_non_negative_check
    check (duration_sec is null or duration_sec >= 0),
  add constraint activities_average_hr_positive_check
    check (average_hr_bpm is null or average_hr_bpm > 0),
  add constraint activities_max_hr_positive_check
    check (max_hr_bpm is null or max_hr_bpm > 0),
  add constraint activities_hr_order_check
    check (
      average_hr_bpm is null
      or max_hr_bpm is null
      or max_hr_bpm >= average_hr_bpm
    ),
  add constraint activities_elevation_gain_non_negative_check
    check (elevation_gain_m is null or elevation_gain_m >= 0),
  add constraint activities_rpe_range_check
    check (rpe is null or rpe between 1 and 10),
  add constraint activities_manual_provider_fields_check
    check (
      source <> 'MANUAL'
      or (external_activity_id is null and raw_data is null)
    );

create index activities_athlete_started_at_idx
  on public.activities (athlete_id, started_at desc);

create unique index activities_source_external_activity_unique_idx
  on public.activities (source, external_activity_id)
  where external_activity_id is not null;

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

alter table public.activities enable row level security;
alter table public.activities force row level security;

drop policy if exists "activities_select_own" on public.activities;
drop policy if exists "activities_insert_own_manual" on public.activities;
drop policy if exists "activities_update_own_manual" on public.activities;
drop policy if exists "activities_delete_own_manual" on public.activities;

create policy "activities_select_own"
on public.activities
for select
to authenticated
using (athlete_id = (select auth.uid()));

create policy "activities_insert_own_manual"
on public.activities
for insert
to authenticated
with check (
  athlete_id = (select auth.uid())
  and source = 'MANUAL'
  and external_activity_id is null
  and raw_data is null
);

create policy "activities_update_own_manual"
on public.activities
for update
to authenticated
using (
  athlete_id = (select auth.uid())
  and source = 'MANUAL'
)
with check (
  athlete_id = (select auth.uid())
  and source = 'MANUAL'
  and external_activity_id is null
  and raw_data is null
);

create policy "activities_delete_own_manual"
on public.activities
for delete
to authenticated
using (
  athlete_id = (select auth.uid())
  and source = 'MANUAL'
);

revoke all on table public.activities from public, anon, authenticated;

grant select on table public.activities to authenticated;
grant insert (
  athlete_id,
  name,
  sport_type,
  started_at,
  distance_m,
  duration_sec,
  average_hr_bpm,
  max_hr_bpm,
  elevation_gain_m,
  rpe,
  notes
) on table public.activities to authenticated;
grant update (
  name,
  sport_type,
  started_at,
  distance_m,
  duration_sec,
  average_hr_bpm,
  max_hr_bpm,
  elevation_gain_m,
  rpe,
  notes
) on table public.activities to authenticated;
grant delete on table public.activities to authenticated;

-- Milestone 5 owns claims. Keep both later-domain tables explicitly closed.
alter table public.training_claims force row level security;
alter table public.claim_activities force row level security;
revoke all on table public.training_claims from public, anon, authenticated;
revoke all on table public.claim_activities from public, anon, authenticated;

commit;
