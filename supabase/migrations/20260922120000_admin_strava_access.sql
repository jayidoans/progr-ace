begin;

-- Absence is denied. Keep the last grant/revocation for a small audit trail.
create table public.strava_access_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  allowed boolean not null default false,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  constraint strava_access_permissions_grant_check check (
    (allowed and granted_at is not null and revoked_at is null and revoked_by is null)
    or (not allowed and granted_at is not null and revoked_at is not null)
  )
);

alter table public.strava_access_permissions enable row level security;
alter table public.strava_access_permissions force row level security;
revoke all on table public.strava_access_permissions from public, anon, authenticated;

-- A connection row (including REAUTH_REQUIRED) is the authoritative M7 connection.
insert into public.strava_access_permissions (user_id, allowed, granted_at)
select athlete_id, true, connected_at from public.strava_connections;

create function public.current_user_strava_permission()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.strava_access_permissions permission
    where permission.user_id = auth.uid() and permission.allowed
  );
$$;
revoke all on function public.current_user_strava_permission() from public, anon, authenticated;
grant execute on function public.current_user_strava_permission() to authenticated;

create function public.admin_get_user_strava_status(p_user_id uuid)
returns table (
  user_id uuid,
  permission_allowed boolean,
  permission_granted_at timestamptz,
  connection_status text,
  last_successful_sync_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'ADMIN'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return query
  select p.id, coalesce(permission.allowed, false), permission.granted_at,
    connection.connection_status, connection.last_successful_sync_at
  from public.profiles p
  left join public.strava_access_permissions permission on permission.user_id = p.id
  left join public.strava_connections connection on connection.athlete_id = p.id
  where p.id = p_user_id;
end;
$$;
revoke all on function public.admin_get_user_strava_status(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_user_strava_status(uuid) to authenticated;

create function public.admin_allow_strava_connection(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'ADMIN'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_user_id is null or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id and r.name = 'ATHLETE'
  ) then
    raise exception 'An athlete account is required' using errcode = '42501';
  end if;
  insert into public.strava_access_permissions
    (user_id, allowed, granted_by, granted_at, revoked_by, revoked_at)
  values (p_user_id, true, auth.uid(), now(), null, null)
  on conflict (user_id) do update
  set allowed = true, granted_by = auth.uid(), granted_at = now(),
      revoked_by = null, revoked_at = null
  where not public.strava_access_permissions.allowed;
end;
$$;
revoke all on function public.admin_allow_strava_connection(uuid) from public, anon, authenticated;
grant execute on function public.admin_allow_strava_connection(uuid) to authenticated;

create function public.admin_revoke_strava_permission(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'ADMIN'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  -- Lock permission first: OAuth finalization must take a compatible lock.
  perform 1 from public.strava_access_permissions
  where user_id = p_user_id for update;
  if exists (select 1 from public.strava_connections where athlete_id = p_user_id) then
    raise exception 'Disconnect Strava before revoking permission' using errcode = '23514';
  end if;
  update public.strava_access_permissions
  set allowed = false, revoked_by = auth.uid(), revoked_at = now()
  where user_id = p_user_id and allowed;
end;
$$;
revoke all on function public.admin_revoke_strava_permission(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_strava_permission(uuid) to authenticated;

-- Runs inside M7's privileged upsert transaction, including ON CONFLICT.
-- Locking the permission serializes callback finalization against revocation.
create function public.enforce_strava_connection_permission()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.strava_access_permissions permission
    where permission.user_id = new.athlete_id and permission.allowed
    for share
  ) then
    raise exception 'Strava connection permission is required' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_strava_connection_permission() from public, anon, authenticated;
create trigger strava_connection_permission_guard
before insert or update on public.strava_connections
for each row execute function public.enforce_strava_connection_permission();

commit;
