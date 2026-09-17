begin;

alter table public.strava_connections
  add column activity_sync_status text not null default 'NEVER',
  add column last_sync_attempt_at timestamptz,
  add column last_successful_sync_at timestamptz,
  add column activity_sync_cursor_at timestamptz,
  add column last_sync_error_code text,
  add column sync_lock_token uuid,
  add column sync_locked_until timestamptz,
  add constraint strava_connections_activity_sync_status_check
    check (activity_sync_status in ('NEVER', 'SYNCING', 'SUCCEEDED', 'FAILED', 'RATE_LIMITED')),
  add constraint strava_connections_activity_sync_lock_check
    check (
      (activity_sync_status = 'SYNCING' and sync_lock_token is not null and sync_locked_until is not null)
      or
      (activity_sync_status <> 'SYNCING' and sync_lock_token is null and sync_locked_until is null)
    ),
  add constraint strava_connections_sync_error_code_check
    check (
      last_sync_error_code is null
      or last_sync_error_code ~ '^[a-z0-9_]{1,64}$'
    );

alter table public.activities
  add constraint activities_strava_external_id_required_check
  check (source <> 'STRAVA' or external_activity_id is not null);

create or replace function public.claim_strava_activity_sync(
  p_athlete_id uuid,
  p_lock_token uuid,
  p_lease_seconds integer default 60
)
returns table (
  sync_state text,
  activity_sync_cursor_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  connection public.strava_connections;
begin
  if p_athlete_id is null or p_lock_token is null
    or p_lease_seconds < 15 or p_lease_seconds > 120
  then
    raise exception 'Activity sync lease parameters are invalid' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = p_athlete_id
      and roles.name = 'ATHLETE'
  ) then
    raise exception 'Athlete profile is required' using errcode = '42501';
  end if;

  select * into connection
  from public.strava_connections
  where athlete_id = p_athlete_id
  for update;

  if connection.id is null then
    return query select 'MISSING'::text, null::timestamptz;
    return;
  end if;

  if connection.connection_status <> 'CONNECTED'
    or not ('activity:read_all' = any(connection.granted_scopes))
  then
    return query select 'REAUTH_REQUIRED'::text, connection.activity_sync_cursor_at;
    return;
  end if;

  if connection.sync_locked_until is not null and connection.sync_locked_until > now() then
    return query select 'BUSY'::text, connection.activity_sync_cursor_at;
    return;
  end if;

  update public.strava_connections
  set activity_sync_status = 'SYNCING',
      last_sync_attempt_at = now(),
      last_sync_error_code = null,
      sync_lock_token = p_lock_token,
      sync_locked_until = now() + make_interval(secs => p_lease_seconds)
  where id = connection.id;

  return query select 'ACQUIRED'::text, connection.activity_sync_cursor_at;
end;
$$;

create or replace function public.complete_strava_activity_sync(
  p_athlete_id uuid,
  p_lock_token uuid,
  p_sync_started_at timestamptz,
  p_activities jsonb
)
returns table (
  created_count integer,
  updated_count integer,
  unchanged_count integer,
  locked_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  connection public.strava_connections;
  item jsonb;
  existing public.activities;
  external_id text;
  activity_name text;
  normalized_sport text;
  activity_started_at timestamptz;
  activity_distance_m integer;
  activity_duration_sec integer;
  activity_average_hr_bpm integer;
  activity_max_hr_bpm integer;
  activity_elevation_gain_m integer;
  activity_raw_data jsonb;
  affected integer;
begin
  created_count := 0;
  updated_count := 0;
  unchanged_count := 0;
  locked_count := 0;

  if p_athlete_id is null or p_lock_token is null or p_sync_started_at is null
    or jsonb_typeof(p_activities) <> 'array'
  then
    raise exception 'Activity sync completion parameters are invalid' using errcode = '22023';
  end if;

  select * into connection
  from public.strava_connections
  where athlete_id = p_athlete_id
  for update;

  if connection.id is null
    or connection.connection_status <> 'CONNECTED'
    or connection.activity_sync_status <> 'SYNCING'
    or connection.sync_lock_token <> p_lock_token
  then
    raise exception 'Activity sync lease is invalid or stale' using errcode = '42501';
  end if;

  if (
    select count(*) <> count(distinct value->>'external_activity_id')
    from jsonb_array_elements(p_activities)
  ) then
    raise exception 'Duplicate Strava Activity identifiers are not allowed in one sync'
      using errcode = '23505';
  end if;

  for item in select value from jsonb_array_elements(p_activities)
  loop
    existing := null;
    external_id := nullif(trim(item->>'external_activity_id'), '');
    activity_name := nullif(trim(item->>'name'), '');
    normalized_sport := item->>'sport_type';
    activity_started_at := (item->>'started_at')::timestamptz;
    activity_distance_m := nullif(item->>'distance_m', '')::integer;
    activity_duration_sec := nullif(item->>'duration_sec', '')::integer;
    activity_average_hr_bpm := nullif(item->>'average_hr_bpm', '')::integer;
    activity_max_hr_bpm := nullif(item->>'max_hr_bpm', '')::integer;
    activity_elevation_gain_m := nullif(item->>'elevation_gain_m', '')::integer;
    activity_raw_data := item->'raw_data';

    if external_id is null or activity_name is null or activity_started_at is null
      or normalized_sport not in (
        'RUNNING', 'STRENGTH_TRAINING', 'WALKING', 'CYCLING', 'PADEL', 'OTHER'
      )
      or activity_raw_data is null or jsonb_typeof(activity_raw_data) <> 'object'
    then
      raise exception 'Normalized Strava Activity is incomplete' using errcode = '22023';
    end if;

    select * into existing
    from public.activities
    where source = 'STRAVA' and external_activity_id = external_id
    for update;

    if existing.id is null then
      insert into public.activities (
        athlete_id, name, sport_type, started_at, distance_m, duration_sec,
        average_hr_bpm, max_hr_bpm, elevation_gain_m, rpe, notes,
        source, external_activity_id, raw_data
      ) values (
        p_athlete_id, activity_name, normalized_sport, activity_started_at,
        activity_distance_m, activity_duration_sec, activity_average_hr_bpm,
        activity_max_hr_bpm, activity_elevation_gain_m, null, null,
        'STRAVA', external_id, activity_raw_data
      );
      created_count := created_count + 1;
      continue;
    end if;

    if existing.athlete_id <> p_athlete_id then
      raise exception 'Strava Activity belongs to another athlete' using errcode = '42501';
    end if;

    if exists (
      select 1
      from public.claim_activities claim_activity
      join public.training_claims claim on claim.id = claim_activity.claim_id
      where claim_activity.activity_id = existing.id
        and claim.status = 'SUBMITTED'
    ) then
      locked_count := locked_count + 1;
      continue;
    end if;

    if existing.name is not distinct from activity_name
      and existing.sport_type is not distinct from normalized_sport
      and existing.started_at is not distinct from activity_started_at
      and existing.distance_m is not distinct from activity_distance_m
      and existing.duration_sec is not distinct from activity_duration_sec
      and existing.average_hr_bpm is not distinct from activity_average_hr_bpm
      and existing.max_hr_bpm is not distinct from activity_max_hr_bpm
      and existing.elevation_gain_m is not distinct from activity_elevation_gain_m
      and existing.raw_data is not distinct from activity_raw_data
    then
      unchanged_count := unchanged_count + 1;
      continue;
    end if;

    update public.activities
    set name = activity_name,
        sport_type = normalized_sport,
        started_at = activity_started_at,
        distance_m = activity_distance_m,
        duration_sec = activity_duration_sec,
        average_hr_bpm = activity_average_hr_bpm,
        max_hr_bpm = activity_max_hr_bpm,
        elevation_gain_m = activity_elevation_gain_m,
        raw_data = activity_raw_data
    where id = existing.id;
    updated_count := updated_count + 1;
  end loop;

  update public.strava_connections
  set activity_sync_status = 'SUCCEEDED',
      last_successful_sync_at = now(),
      activity_sync_cursor_at = p_sync_started_at,
      last_sync_error_code = null,
      sync_lock_token = null,
      sync_locked_until = null
  where athlete_id = p_athlete_id
    and sync_lock_token = p_lock_token;

  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Activity sync lease was lost before completion' using errcode = '40001';
  end if;

  return next;
end;
$$;

create or replace function public.fail_strava_activity_sync(
  p_athlete_id uuid,
  p_lock_token uuid,
  p_sync_status text,
  p_error_code text,
  p_require_reauth boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if p_athlete_id is null or p_lock_token is null
    or p_sync_status not in ('FAILED', 'RATE_LIMITED')
    or p_error_code is null or p_error_code !~ '^[a-z0-9_]{1,64}$'
  then
    raise exception 'Activity sync failure parameters are invalid' using errcode = '22023';
  end if;

  update public.strava_connections
  set activity_sync_status = p_sync_status,
      last_sync_error_code = p_error_code,
      connection_status = case
        when p_require_reauth then 'REAUTH_REQUIRED'
        else connection_status
      end,
      sync_lock_token = null,
      sync_locked_until = null
  where athlete_id = p_athlete_id
    and activity_sync_status = 'SYNCING'
    and sync_lock_token = p_lock_token;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke execute on function public.claim_strava_activity_sync(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_strava_activity_sync(uuid, uuid, integer)
  to service_role;

revoke execute on function public.complete_strava_activity_sync(uuid, uuid, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_strava_activity_sync(uuid, uuid, timestamptz, jsonb)
  to service_role;

revoke execute on function public.fail_strava_activity_sync(uuid, uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.fail_strava_activity_sync(uuid, uuid, text, text, boolean)
  to service_role;

grant select (
  activity_sync_status,
  last_sync_attempt_at,
  last_successful_sync_at,
  activity_sync_cursor_at,
  last_sync_error_code
) on table public.strava_connections to authenticated;

commit;
