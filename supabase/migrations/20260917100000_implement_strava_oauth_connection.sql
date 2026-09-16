begin;

create table public.strava_connections (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null unique
    references public.profiles(id) on delete cascade,
  strava_athlete_id bigint not null unique,
  strava_display_name text,
  granted_scopes text[] not null,
  connection_status text not null,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  access_token_expires_at timestamptz not null,
  token_version bigint not null default 1,
  refresh_lock_token uuid,
  refresh_locked_until timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strava_connections_athlete_id_positive_check
    check (strava_athlete_id > 0),
  constraint strava_connections_scopes_check
    check (
      array_position(granted_scopes, null) is null
      and granted_scopes <@ array[
        'read',
        'read_all',
        'profile:read_all',
        'profile:write',
        'activity:read',
        'activity:read_all',
        'activity:write'
      ]::text[]
    ),
  constraint strava_connections_status_check
    check (connection_status in ('CONNECTED', 'REAUTH_REQUIRED')),
  constraint strava_connections_token_version_check
    check (token_version > 0),
  constraint strava_connections_refresh_lock_check
    check (
      (refresh_lock_token is null and refresh_locked_until is null)
      or (refresh_lock_token is not null and refresh_locked_until is not null)
    )
);

create index strava_connections_status_idx
  on public.strava_connections (connection_status);

create table public.strava_oauth_states (
  state_hash text primary key,
  athlete_id uuid not null unique
    references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint strava_oauth_states_hash_check
    check (state_hash ~ '^[0-9a-f]{64}$'),
  constraint strava_oauth_states_expiry_check
    check (expires_at > created_at)
);

create index strava_oauth_states_expiry_idx
  on public.strava_oauth_states (expires_at);

drop trigger if exists strava_connections_set_updated_at on public.strava_connections;
create trigger strava_connections_set_updated_at
before update on public.strava_connections
for each row execute function public.set_updated_at();

create or replace function public.create_strava_oauth_state(
  p_state_hash text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_role('ATHLETE') then
    raise exception 'Athlete authentication is required' using errcode = '42501';
  end if;
  if p_state_hash is null or p_state_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'OAuth state hash is invalid' using errcode = '22023';
  end if;
  if p_expires_at is null
    or p_expires_at <= now()
    or p_expires_at > now() + interval '15 minutes'
  then
    raise exception 'OAuth state expiry is invalid' using errcode = '22023';
  end if;

  delete from public.strava_oauth_states
  where athlete_id = auth.uid() or expires_at <= now();

  insert into public.strava_oauth_states (state_hash, athlete_id, expires_at)
  values (p_state_hash, auth.uid(), p_expires_at);
end;
$$;

create or replace function public.consume_strava_oauth_state(p_state_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_expiry timestamptz;
begin
  if auth.uid() is null or not public.has_role('ATHLETE') then
    return false;
  end if;
  if p_state_hash is null or p_state_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  delete from public.strava_oauth_states
  where state_hash = p_state_hash
    and athlete_id = auth.uid()
  returning expires_at into state_expiry;

  return state_expiry is not null and state_expiry > now();
end;
$$;

create or replace function public.upsert_strava_connection(
  p_athlete_id uuid,
  p_strava_athlete_id bigint,
  p_strava_display_name text,
  p_granted_scopes text[],
  p_connection_status text,
  p_access_token_ciphertext text,
  p_access_token_iv text,
  p_refresh_token_ciphertext text,
  p_refresh_token_iv text,
  p_access_token_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_identity bigint;
begin
  if p_athlete_id is null or not exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = p_athlete_id
      and roles.name = 'ATHLETE'
  ) then
    raise exception 'Athlete profile is required' using errcode = '42501';
  end if;
  if p_strava_athlete_id is null or p_strava_athlete_id <= 0 then
    raise exception 'Strava athlete identity is invalid' using errcode = '22023';
  end if;
  if p_connection_status not in ('CONNECTED', 'REAUTH_REQUIRED') then
    raise exception 'Strava connection status is invalid' using errcode = '22023';
  end if;
  if p_granted_scopes is null then
    raise exception 'Granted Strava scopes are required' using errcode = '22023';
  end if;
  if length(coalesce(p_access_token_ciphertext, '')) = 0
    or length(coalesce(p_access_token_iv, '')) = 0
    or length(coalesce(p_refresh_token_ciphertext, '')) = 0
    or length(coalesce(p_refresh_token_iv, '')) = 0
    or p_access_token_expires_at is null
  then
    raise exception 'Encrypted Strava credentials are incomplete' using errcode = '22023';
  end if;

  select strava_athlete_id into existing_identity
  from public.strava_connections
  where athlete_id = p_athlete_id
  for update;

  if existing_identity is not null and existing_identity <> p_strava_athlete_id then
    raise exception 'Disconnect the existing Strava identity before connecting another one'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.strava_connections
    where strava_athlete_id = p_strava_athlete_id
      and athlete_id <> p_athlete_id
  ) then
    raise exception 'This Strava identity is already connected'
      using errcode = '23505';
  end if;

  insert into public.strava_connections (
    athlete_id,
    strava_athlete_id,
    strava_display_name,
    granted_scopes,
    connection_status,
    access_token_ciphertext,
    access_token_iv,
    refresh_token_ciphertext,
    refresh_token_iv,
    access_token_expires_at
  )
  values (
    p_athlete_id,
    p_strava_athlete_id,
    nullif(trim(p_strava_display_name), ''),
    p_granted_scopes,
    p_connection_status,
    p_access_token_ciphertext,
    p_access_token_iv,
    p_refresh_token_ciphertext,
    p_refresh_token_iv,
    p_access_token_expires_at
  )
  on conflict (athlete_id) do update
  set strava_display_name = excluded.strava_display_name,
      granted_scopes = excluded.granted_scopes,
      connection_status = excluded.connection_status,
      access_token_ciphertext = excluded.access_token_ciphertext,
      access_token_iv = excluded.access_token_iv,
      refresh_token_ciphertext = excluded.refresh_token_ciphertext,
      refresh_token_iv = excluded.refresh_token_iv,
      access_token_expires_at = excluded.access_token_expires_at,
      token_version = public.strava_connections.token_version + 1,
      refresh_lock_token = null,
      refresh_locked_until = null,
      connected_at = now();
end;
$$;

create or replace function public.get_strava_connection_credentials(p_athlete_id uuid)
returns table (
  strava_athlete_id bigint,
  granted_scopes text[],
  connection_status text,
  access_token_ciphertext text,
  access_token_iv text,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  access_token_expires_at timestamptz,
  token_version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    connection.strava_athlete_id,
    connection.granted_scopes,
    connection.connection_status,
    connection.access_token_ciphertext,
    connection.access_token_iv,
    connection.refresh_token_ciphertext,
    connection.refresh_token_iv,
    connection.access_token_expires_at,
    connection.token_version
  from public.strava_connections connection
  where p_athlete_id is not null
    and exists (
      select 1
      from public.user_roles
      join public.roles on roles.id = user_roles.role_id
      where user_roles.user_id = p_athlete_id
        and roles.name = 'ATHLETE'
    )
    and connection.athlete_id = p_athlete_id;
$$;

create or replace function public.claim_strava_token_refresh(
  p_athlete_id uuid,
  p_refresh_before timestamptz,
  p_lock_token uuid,
  p_lease_seconds integer default 30
)
returns table (
  refresh_state text,
  access_token_ciphertext text,
  access_token_iv text,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  access_token_expires_at timestamptz,
  token_version bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  connection public.strava_connections;
begin
  if p_athlete_id is null or not exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = p_athlete_id
      and roles.name = 'ATHLETE'
  ) then
    raise exception 'Athlete profile is required' using errcode = '42501';
  end if;
  if p_refresh_before is null
    or p_refresh_before < now()
    or p_refresh_before > now() + interval '2 hours'
    or p_lock_token is null
    or p_lease_seconds < 5
    or p_lease_seconds > 60
  then
    raise exception 'Refresh lease parameters are invalid' using errcode = '22023';
  end if;

  select * into connection
  from public.strava_connections
  where athlete_id = p_athlete_id
  for update;

  if connection.id is null then
    return query select 'MISSING'::text, null::text, null::text, null::text,
      null::text, null::timestamptz, null::bigint;
    return;
  end if;

  if connection.access_token_expires_at > p_refresh_before then
    return query select 'VALID'::text,
      connection.access_token_ciphertext,
      connection.access_token_iv,
      null::text,
      null::text,
      connection.access_token_expires_at,
      connection.token_version;
    return;
  end if;

  if connection.refresh_locked_until is not null
    and connection.refresh_locked_until > now()
  then
    return query select 'BUSY'::text, null::text, null::text, null::text,
      null::text, connection.access_token_expires_at, connection.token_version;
    return;
  end if;

  update public.strava_connections
  set refresh_lock_token = p_lock_token,
      refresh_locked_until = now() + make_interval(secs => p_lease_seconds),
      token_version = public.strava_connections.token_version + 1
  where id = connection.id
  returning * into connection;

  return query select 'ACQUIRED'::text,
    connection.access_token_ciphertext,
    connection.access_token_iv,
    connection.refresh_token_ciphertext,
    connection.refresh_token_iv,
    connection.access_token_expires_at,
    connection.token_version;
end;
$$;

create or replace function public.complete_strava_token_refresh(
  p_athlete_id uuid,
  p_lock_token uuid,
  p_token_version bigint,
  p_access_token_ciphertext text,
  p_access_token_iv text,
  p_refresh_token_ciphertext text,
  p_refresh_token_iv text,
  p_access_token_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if p_athlete_id is null or not exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = p_athlete_id
      and roles.name = 'ATHLETE'
  ) then
    raise exception 'Athlete profile is required' using errcode = '42501';
  end if;
  if p_lock_token is null
    or p_token_version is null
    or length(coalesce(p_access_token_ciphertext, '')) = 0
    or length(coalesce(p_access_token_iv, '')) = 0
    or length(coalesce(p_refresh_token_ciphertext, '')) = 0
    or length(coalesce(p_refresh_token_iv, '')) = 0
    or p_access_token_expires_at is null
  then
    raise exception 'Refreshed Strava credentials are incomplete' using errcode = '22023';
  end if;

  update public.strava_connections
  set access_token_ciphertext = p_access_token_ciphertext,
      access_token_iv = p_access_token_iv,
      refresh_token_ciphertext = p_refresh_token_ciphertext,
      refresh_token_iv = p_refresh_token_iv,
      access_token_expires_at = p_access_token_expires_at,
      refresh_lock_token = null,
      refresh_locked_until = null
  where athlete_id = p_athlete_id
    and refresh_lock_token = p_lock_token
    and token_version = p_token_version;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.release_strava_token_refresh(
  p_athlete_id uuid,
  p_lock_token uuid,
  p_token_version bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if p_athlete_id is null or not exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = p_athlete_id
      and roles.name = 'ATHLETE'
  ) then
    return false;
  end if;

  update public.strava_connections
  set refresh_lock_token = null,
      refresh_locked_until = null
  where athlete_id = p_athlete_id
    and refresh_lock_token = p_lock_token
    and token_version = p_token_version;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.delete_strava_connection(p_athlete_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if p_athlete_id is null or not exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = p_athlete_id
      and roles.name = 'ATHLETE'
  ) then
    raise exception 'Athlete profile is required' using errcode = '42501';
  end if;

  delete from public.strava_connections
  where athlete_id = p_athlete_id;

  get diagnostics deleted_count = row_count;
  return deleted_count <= 1;
end;
$$;

alter table public.strava_connections enable row level security;
alter table public.strava_connections force row level security;
alter table public.strava_oauth_states enable row level security;
alter table public.strava_oauth_states force row level security;

create policy "strava_connections_select_own_status"
on public.strava_connections
for select
to authenticated
using (
  athlete_id = (select auth.uid())
  and public.has_role('ATHLETE')
);

revoke all on table public.strava_connections from public, anon, authenticated;
revoke all on table public.strava_oauth_states from public, anon, authenticated;

grant select (
  id,
  athlete_id,
  strava_athlete_id,
  strava_display_name,
  granted_scopes,
  connection_status,
  connected_at,
  updated_at
) on table public.strava_connections to authenticated;

revoke execute on function public.create_strava_oauth_state(text, timestamptz)
  from public, anon;
grant execute on function public.create_strava_oauth_state(text, timestamptz)
  to authenticated;
revoke execute on function public.consume_strava_oauth_state(text)
  from public, anon;
grant execute on function public.consume_strava_oauth_state(text)
  to authenticated;
revoke execute on function public.upsert_strava_connection(
  uuid, bigint, text, text[], text, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.upsert_strava_connection(
  uuid, bigint, text, text[], text, text, text, text, text, timestamptz
) to service_role;
revoke execute on function public.get_strava_connection_credentials(uuid)
  from public, anon, authenticated;
grant execute on function public.get_strava_connection_credentials(uuid)
  to service_role;
revoke execute on function public.claim_strava_token_refresh(uuid, timestamptz, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_strava_token_refresh(uuid, timestamptz, uuid, integer)
  to service_role;
revoke execute on function public.complete_strava_token_refresh(
  uuid, uuid, bigint, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.complete_strava_token_refresh(
  uuid, uuid, bigint, text, text, text, text, timestamptz
) to service_role;
revoke execute on function public.release_strava_token_refresh(uuid, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.release_strava_token_refresh(uuid, uuid, bigint)
  to service_role;
revoke execute on function public.delete_strava_connection(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_strava_connection(uuid)
  to service_role;

commit;
