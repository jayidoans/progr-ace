begin;

alter table public.athlete_race_goals
  add column completed_at timestamptz,
  add column completed_by uuid references public.profiles(id) on delete restrict;

-- Existing completed goals remain historical. Their original actor is unknown,
-- so only the completion time can be backfilled from the last lifecycle update.
-- The existing history trigger intentionally rejects all updates to terminal
-- goals. Remove it only for this transactional backfill, then recreate it
-- with the stricter audit-aware implementation below.
drop trigger if exists athlete_race_goals_protect_history on public.athlete_race_goals;
update public.athlete_race_goals
set completed_at = updated_at
where status = 'COMPLETED';

alter table public.athlete_race_goals
  add constraint athlete_race_goals_completion_audit_check
  check (
    (status = 'COMPLETED' and completed_at is not null)
    or (status <> 'COMPLETED' and completed_at is null and completed_by is null)
  );

create index athlete_race_goals_completed_by_idx
  on public.athlete_race_goals (completed_by)
  where completed_by is not null;

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

  if new.status = 'COMPLETED' then
    if new.completed_at is null
      or new.completed_by is null
      or new.completed_by is distinct from auth.uid()
    then
      raise exception 'Race goal completion audit is invalid' using errcode = '42501';
    end if;
  elsif new.completed_at is not null or new.completed_by is not null then
    raise exception 'Completion audit is only valid for completed goals' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger athlete_race_goals_protect_history
before update on public.athlete_race_goals
for each row execute function public.protect_race_goal_history();

drop policy if exists "race_goals_update_own_active" on public.athlete_race_goals;
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
  and status in ('ACTIVE', 'CANCELLED')
);

create function public.complete_coached_race_goal(p_race_goal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  goal_record public.athlete_race_goals;
  race_date date;
  is_admin boolean;
  is_coach boolean;
  owns_program boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select
    coalesce(bool_or(role.name = 'ADMIN'), false),
    coalesce(bool_or(role.name = 'COACH'), false)
  into is_admin, is_coach
  from public.user_roles user_role
  join public.roles role on role.id = user_role.role_id
  where user_role.user_id = current_user_id;

  select goal.*
  into goal_record
  from public.athlete_race_goals goal
  where goal.id = p_race_goal_id
  for update;

  if goal_record.id is null then
    raise exception 'Race goal was not found' using errcode = 'P0002';
  end if;

  select race.event_date
  into race_date
  from public.races race
  where race.id = goal_record.race_id;

  select exists (
    select 1
    from public.training_programs program
    where program.race_goal_id = goal_record.id
      and program.created_by = current_user_id
  ) into owns_program;

  if not is_admin and (
    not is_coach
    or not owns_program
    or goal_record.athlete_id = current_user_id
  ) then
    raise exception 'Race goal completion is unavailable' using errcode = '42501';
  end if;

  if goal_record.status <> 'ACTIVE' then
    raise exception 'Only an active race goal can be completed' using errcode = '23514';
  end if;

  if current_date < race_date then
    raise exception 'Race goal cannot be completed before race day' using errcode = '23514';
  end if;

  update public.athlete_race_goals
  set status = 'COMPLETED',
      completed_at = now(),
      completed_by = current_user_id
  where id = goal_record.id;

  return goal_record.id;
end;
$$;

create function public.require_active_training_program_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.athlete_race_goals goal
    where goal.id = new.race_goal_id
      and goal.status = 'ACTIVE'
  ) then
    raise exception 'A new training program requires an active race goal'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists training_programs_require_active_goal on public.training_programs;
create trigger training_programs_require_active_goal
before insert or update of race_goal_id on public.training_programs
for each row execute function public.require_active_training_program_goal();

revoke execute on function public.complete_coached_race_goal(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_coached_race_goal(uuid) to authenticated;

revoke execute on function public.require_active_training_program_goal()
  from public, anon, authenticated;

commit;
