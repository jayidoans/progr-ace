begin;

alter table public.profiles
  add column must_change_password boolean not null default false;

create function public.current_user_must_change_password()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and coalesce((
    select profile.must_change_password
    from public.profiles profile
    where profile.id = auth.uid()
  ), false);
$$;
revoke all on function public.current_user_must_change_password() from public, anon, authenticated;
grant execute on function public.current_user_must_change_password() to authenticated;

create function public.set_user_must_change_password(p_user_id uuid, p_required boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user_id is null or p_required is null or not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception 'Valid user and password state are required' using errcode = '22023';
  end if;
  update public.profiles set must_change_password = p_required where id = p_user_id;
end;
$$;
revoke all on function public.set_user_must_change_password(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_user_must_change_password(uuid, boolean) to service_role;

create function public.admin_get_user_password_status(p_user_id uuid)
returns table (user_id uuid, must_change_password boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur join public.roles role on role.id = ur.role_id
    where ur.user_id = auth.uid() and role.name = 'ADMIN'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return query select profile.id, profile.must_change_password
  from public.profiles profile where profile.id = p_user_id;
end;
$$;
revoke all on function public.admin_get_user_password_status(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_get_user_password_status(uuid) to authenticated;

create function public.admin_list_user_strava_states()
returns table (user_id uuid, strava_connected boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur join public.roles role on role.id = ur.role_id
    where ur.user_id = auth.uid() and role.name = 'ADMIN'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return query
  select profile.id, coalesce(connection.connection_status = 'CONNECTED', false)
  from public.profiles profile
  left join public.strava_connections connection on connection.athlete_id = profile.id;
end;
$$;
revoke all on function public.admin_list_user_strava_states()
  from public, anon, authenticated;
grant execute on function public.admin_list_user_strava_states() to authenticated;

commit;
