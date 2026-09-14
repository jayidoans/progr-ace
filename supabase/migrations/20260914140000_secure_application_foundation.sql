begin;

update public.profiles
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.profiles
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

update public.roles
set name = upper(trim(name)),
    created_at = coalesce(created_at, now());

alter table public.roles
  alter column created_at set default now(),
  alter column created_at set not null,
  add constraint roles_name_format_check
    check (name = upper(name) and name ~ '^[A-Z_]+$');

update public.user_roles
set created_at = coalesce(created_at, now());

alter table public.user_roles
  alter column created_at set default now(),
  alter column created_at set not null;

insert into public.roles (name, description)
values
  ('ATHLETE', 'Athlete account with access to its own profile and future training data.'),
  ('COACH', 'Coach account; athlete assignment access is reserved for a later milestone.'),
  ('ADMIN', 'Administrative account; elevated workflows require explicit future policies.')
on conflict (name) do update
set description = excluded.description;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete_role_id bigint;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  select id into athlete_role_id
  from public.roles
  where name = 'ATHLETE';

  if athlete_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, athlete_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_change();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_change();

insert into public.profiles (id, full_name, email)
select
  users.id,
  nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
  users.email
from auth.users as users
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

insert into public.user_roles (user_id, role_id)
select profiles.id, roles.id
from public.profiles as profiles
cross join public.roles as roles
where roles.name = 'ATHLETE'
on conflict (user_id, role_id) do nothing;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.roles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.user_roles to authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_change() from public, anon, authenticated;

commit;
