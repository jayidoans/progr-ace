begin;

alter table public.strava_connections
  add column activity_sync_hour_started_at timestamptz,
  add column activity_sync_attempt_count smallint not null default 0,
  add constraint strava_connections_activity_sync_attempt_count_check
    check (activity_sync_attempt_count between 0 and 2);

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
  current_hour timestamptz := date_trunc('hour', now() at time zone 'UTC') at time zone 'UTC';
  attempts_this_hour smallint;
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

  attempts_this_hour := case
    when connection.activity_sync_hour_started_at = current_hour
      then connection.activity_sync_attempt_count
    else 0
  end;

  if attempts_this_hour >= 2 then
    update public.strava_connections
    set activity_sync_status = 'RATE_LIMITED',
        last_sync_error_code = 'hourly_sync_limit',
        sync_lock_token = null,
        sync_locked_until = null
    where id = connection.id;

    return query select 'RATE_LIMITED'::text, connection.activity_sync_cursor_at;
    return;
  end if;

  update public.strava_connections
  set activity_sync_status = 'SYNCING',
      last_sync_attempt_at = now(),
      last_sync_error_code = null,
      activity_sync_hour_started_at = current_hour,
      activity_sync_attempt_count = attempts_this_hour + 1,
      sync_lock_token = p_lock_token,
      sync_locked_until = now() + make_interval(secs => p_lease_seconds)
  where id = connection.id;

  return query select 'ACQUIRED'::text, connection.activity_sync_cursor_at;
end;
$$;

revoke execute on function public.claim_strava_activity_sync(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_strava_activity_sync(uuid, uuid, integer)
  to service_role;

grant select (
  activity_sync_hour_started_at,
  activity_sync_attempt_count
) on table public.strava_connections to authenticated;

drop policy if exists "races_insert_own_provenance" on public.races;
create policy "races_insert_admin_or_coach"
on public.races
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (public.has_role('ADMIN') or public.has_role('COACH'))
);

commit;
