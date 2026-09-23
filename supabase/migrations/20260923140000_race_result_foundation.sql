begin;

create table public.race_results (
  id uuid primary key default gen_random_uuid(),
  athlete_race_goal_id uuid not null references public.athlete_race_goals(id) on delete restrict,
  status text not null,
  finish_time_sec integer,
  result_source text not null default 'MANUAL',
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint race_results_status_check check (status in ('FINISHED', 'DNF', 'DNS')),
  constraint race_results_source_check check (result_source = 'MANUAL'),
  constraint race_results_finish_time_check check (
    (status = 'FINISHED' and finish_time_sec is not null and finish_time_sec > 0)
    or (status in ('DNF', 'DNS') and finish_time_sec is null)
  ),
  constraint race_results_notes_length_check check (notes is null or length(notes) <= 2000),
  unique (athlete_race_goal_id)
);

create index race_results_recorded_by_idx on public.race_results (recorded_by);

create trigger race_results_set_updated_at
before update on public.race_results
for each row execute function public.set_updated_at();

alter table public.race_results enable row level security;
alter table public.race_results force row level security;

create or replace function public.race_result_actor_can_access_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.athlete_race_goals goal
    where goal.id = p_goal_id
      and (
        goal.athlete_id = auth.uid()
        or public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and exists (
            select 1
            from public.training_programs program
            where program.race_goal_id = goal.id
              and program.created_by = auth.uid()
          )
        )
      )
  );
$$;

create policy "race_results_select_authorized"
on public.race_results
for select
to authenticated
using (public.race_result_actor_can_access_goal(athlete_race_goal_id));

create or replace function public.create_race_result(
  p_athlete_race_goal_id uuid,
  p_status text,
  p_finish_time_sec integer default null,
  p_notes text default null
)
returns public.race_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  goal_record public.athlete_race_goals;
  race_date date;
  result_record public.race_results;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select goal.* into goal_record
  from public.athlete_race_goals goal
  where goal.id = p_athlete_race_goal_id;
  if goal_record.id is null then
    raise exception 'Race goal was not found' using errcode = 'P0002';
  end if;

  if goal_record.status = 'CANCELLED' then
    raise exception 'Cancelled race goals cannot receive a new result' using errcode = '23514';
  end if;
  if not public.race_result_actor_can_access_goal(goal_record.id) then
    raise exception 'Race result access is unavailable' using errcode = '42501';
  end if;

  select race.event_date into race_date from public.races race where race.id = goal_record.race_id;
  if current_date < race_date then
    raise exception 'Race result cannot be recorded before race day' using errcode = '23514';
  end if;

  insert into public.race_results (athlete_race_goal_id, status, finish_time_sec, notes, recorded_by)
  values (goal_record.id, p_status, p_finish_time_sec, nullif(trim(p_notes), ''), actor_id)
  returning * into result_record;
  return result_record;
exception
  when unique_violation then
    raise exception 'A race result already exists for this race goal' using errcode = '23505';
end;
$$;

create or replace function public.update_race_result(
  p_race_result_id uuid,
  p_status text,
  p_finish_time_sec integer default null,
  p_notes text default null
)
returns public.race_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_record public.race_results;
  updated_record public.race_results;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select result.* into result_record
  from public.race_results result
  where result.id = p_race_result_id
  for update;
  if result_record.id is null then
    raise exception 'Race result was not found' using errcode = 'P0002';
  end if;
  if not public.race_result_actor_can_access_goal(result_record.athlete_race_goal_id) then
    raise exception 'Race result access is unavailable' using errcode = '42501';
  end if;

  update public.race_results
  set status = p_status,
      finish_time_sec = p_finish_time_sec,
      notes = nullif(trim(p_notes), '')
  where id = result_record.id
  returning * into updated_record;
  return updated_record;
end;
$$;

revoke all on table public.race_results from public, anon, authenticated;
grant select on table public.race_results to authenticated;
revoke execute on function public.race_result_actor_can_access_goal(uuid) from public, anon, authenticated;
revoke execute on function public.create_race_result(uuid, text, integer, text) from public, anon;
revoke execute on function public.update_race_result(uuid, text, integer, text) from public, anon;
grant execute on function public.create_race_result(uuid, text, integer, text) to authenticated;
grant execute on function public.update_race_result(uuid, text, integer, text) to authenticated;
grant execute on function public.race_result_actor_can_access_goal(uuid) to authenticated;

commit;
