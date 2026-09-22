begin;

-- Replace the earlier cross-user role SELECT policy with a narrow read boundary.
drop policy if exists "user_roles_select_admin" on public.user_roles;

create function public.admin_list_users()
returns table (
  user_id uuid,
  full_name text,
  email text,
  roles text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_roles caller_role
    join public.roles role on role.id = caller_role.role_id
    where caller_role.user_id = auth.uid() and role.name = 'ADMIN'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  return query
  select profile.id, profile.full_name, profile.email,
    coalesce(array_agg(role.name order by case role.name
      when 'ATHLETE' then 1 when 'COACH' then 2 when 'ADMIN' then 3 end)
      filter (where role.name in ('ATHLETE', 'COACH', 'ADMIN')), array[]::text[])
  from public.profiles profile
  left join public.user_roles assignment on assignment.user_id = profile.id
  left join public.roles role on role.id = assignment.role_id
  group by profile.id, profile.full_name, profile.email
  order by lower(coalesce(profile.full_name, '')), profile.id;
end;
$$;

revoke all on function public.admin_list_users() from public, anon, authenticated;
grant execute on function public.admin_list_users() to authenticated;

commit;
