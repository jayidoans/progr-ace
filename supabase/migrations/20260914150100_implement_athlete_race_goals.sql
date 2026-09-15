begin;

-- Refuse to invent required domain data when upgrading a populated legacy schema.
do $$
begin
  if exists (
    select 1
    from public.races
    where race_date is null or distance_km is null or distance_km <= 0
  ) then
    raise exception
      'Milestone 2 migration requires every existing race to have a date and positive distance';
  end if;

  if exists (
    select 1
    from public.athlete_race_goals
    where target_time is null or extract(epoch from target_time) <= 0
  ) then
    raise exception
      'Milestone 2 migration requires every existing race goal to have a positive target time';
  end if;

  if exists (
    select athlete_id
    from public.athlete_race_goals
    group by athlete_id
    having count(*) > 1
  ) then
    raise exception
      'Existing race goals require an explicit ACTIVE/history status mapping before Milestone 2';
  end if;
end;
$$;

alter table public.races rename column race_date to event_date;

alter table public.races
  add column distance_m integer,
  add column created_by uuid references public.profiles(id) on delete set null,
  add column updated_at timestamptz;

update public.races
set distance_m = round(distance_km * 1000)::integer,
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(created_at, now());

alter table public.races
  drop column distance_km,
  alter column event_date set not null,
  alter column distance_m set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint races_name_not_blank_check check (length(trim(name)) > 0),
  add constraint races_distance_m_positive_check check (distance_m > 0);

create unique index races_identity_unique_idx
on public.races (
  lower(trim(name)),
  event_date,
  distance_m,
  coalesce(lower(trim(location)), '')
);

create index races_event_date_idx on public.races (event_date);

alter table public.athlete_race_goals
  add column target_finish_time_sec integer,
  add column status text not null default 'ACTIVE',
  add column updated_at timestamptz;

update public.athlete_race_goals
set target_finish_time_sec = round(extract(epoch from target_time))::integer,
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(created_at, now());

alter table public.athlete_race_goals
  drop constraint athlete_race_goals_athlete_id_race_id_key,
  drop constraint athlete_race_goals_race_id_fkey,
  drop column target_time,
  drop column target_pace,
  alter column target_finish_time_sec set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint athlete_race_goals_target_finish_time_positive_check
    check (target_finish_time_sec > 0),
  add constraint athlete_race_goals_status_check
    check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  add constraint athlete_race_goals_race_id_fkey
    foreign key (race_id) references public.races(id) on delete restrict;

create unique index athlete_race_goals_one_active_idx
on public.athlete_race_goals (athlete_id)
where status = 'ACTIVE';

create index athlete_race_goals_athlete_status_idx
on public.athlete_race_goals (athlete_id, status);

create index athlete_race_goals_race_id_idx
on public.athlete_race_goals (race_id);

drop trigger if exists races_set_updated_at on public.races;
create trigger races_set_updated_at
before update on public.races
for each row execute function public.set_updated_at();

drop trigger if exists athlete_race_goals_set_updated_at on public.athlete_race_goals;
create trigger athlete_race_goals_set_updated_at
before update on public.athlete_race_goals
for each row execute function public.set_updated_at();

create or replace function public.protect_race_goal_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'Historical race goals are immutable' using errcode = '23514';
  end if;

  if new.id is distinct from old.id
    or new.athlete_id is distinct from old.athlete_id
    or new.race_id is distinct from old.race_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Race goal identity and audit fields are immutable' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists athlete_race_goals_protect_history on public.athlete_race_goals;
create trigger athlete_race_goals_protect_history
before update on public.athlete_race_goals
for each row execute function public.protect_race_goal_history();

alter table public.races enable row level security;
alter table public.races force row level security;
alter table public.athlete_race_goals enable row level security;
alter table public.athlete_race_goals force row level security;

create policy "races_select_authenticated"
on public.races
for select
to authenticated
using (true);

create policy "races_insert_own_provenance"
on public.races
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "races_update_admin"
on public.races
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = (select auth.uid())
      and roles.name = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = (select auth.uid())
      and roles.name = 'ADMIN'
  )
);

create policy "races_delete_admin"
on public.races
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = (select auth.uid())
      and roles.name = 'ADMIN'
  )
);

create policy "race_goals_select_own"
on public.athlete_race_goals
for select
to authenticated
using (athlete_id = (select auth.uid()));

create policy "race_goals_insert_own_active"
on public.athlete_race_goals
for insert
to authenticated
with check (
  athlete_id = (select auth.uid())
  and status = 'ACTIVE'
);

create policy "race_goals_update_own_active"
on public.athlete_race_goals
for update
to authenticated
using (
  athlete_id = (select auth.uid())
  and status = 'ACTIVE'
)
with check (
  athlete_id = (select auth.uid())
  and status in ('ACTIVE', 'COMPLETED', 'CANCELLED')
);

revoke all on table public.races from public, anon, authenticated;
revoke all on table public.athlete_race_goals from public, anon, authenticated;

grant select on table public.races to authenticated;
grant insert (name, event_date, location, distance_m, created_by)
  on table public.races to authenticated;
grant update (name, event_date, location, distance_m)
  on table public.races to authenticated;
grant delete on table public.races to authenticated;

grant select on table public.athlete_race_goals to authenticated;
grant insert (athlete_id, race_id, target_finish_time_sec, status, notes)
  on table public.athlete_race_goals to authenticated;
grant update (target_finish_time_sec, status, notes)
  on table public.athlete_race_goals to authenticated;

create or replace function public.set_active_race_goal(
  p_race_id uuid,
  p_target_finish_time_sec integer,
  p_notes text default null
)
returns public.athlete_race_goals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_goal public.athlete_race_goals;
  new_goal public.athlete_race_goals;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if p_target_finish_time_sec is null or p_target_finish_time_sec <= 0 then
    raise exception 'Target finish time must be positive' using errcode = '22023';
  end if;

  select * into current_goal
  from public.athlete_race_goals
  where athlete_id = auth.uid()
    and status = 'ACTIVE'
  for update;

  if current_goal.id is not null and current_goal.race_id = p_race_id then
    update public.athlete_race_goals
    set target_finish_time_sec = p_target_finish_time_sec,
        notes = nullif(trim(p_notes), '')
    where id = current_goal.id
    returning * into new_goal;

    return new_goal;
  end if;

  if current_goal.id is not null then
    update public.athlete_race_goals
    set status = 'CANCELLED'
    where id = current_goal.id;
  end if;

  insert into public.athlete_race_goals (
    athlete_id,
    race_id,
    target_finish_time_sec,
    status,
    notes
  )
  values (
    auth.uid(),
    p_race_id,
    p_target_finish_time_sec,
    'ACTIVE',
    nullif(trim(p_notes), '')
  )
  returning * into new_goal;

  return new_goal;
end;
$$;

revoke execute on function public.protect_race_goal_history() from public, anon, authenticated;
revoke execute on function public.set_active_race_goal(uuid, integer, text)
  from public, anon;
grant execute on function public.set_active_race_goal(uuid, integer, text)
  to authenticated;

commit;
