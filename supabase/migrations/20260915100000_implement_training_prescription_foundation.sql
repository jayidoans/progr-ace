begin;

-- Existing placeholder rows need explicit ownership and required dates before this
-- migration can safely make the training domain authoritative.
do $$
begin
  if exists (select 1 from public.training_programs) then
    raise exception
      'Milestone 3 requires an explicit migration plan for existing placeholder training programs';
  end if;
end;
$$;

alter table public.training_programs
  drop constraint training_programs_race_goal_id_fkey,
  drop constraint training_programs_athlete_id_fkey,
  drop column athlete_id,
  add column created_by uuid references public.profiles(id) on delete restrict,
  add column status text not null default 'DRAFT';

update public.training_programs
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.training_programs
  alter column race_goal_id set not null,
  alter column start_date set not null,
  alter column end_date set not null,
  alter column created_by set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint training_programs_race_goal_id_fkey
    foreign key (race_goal_id) references public.athlete_race_goals(id) on delete restrict,
  add constraint training_programs_name_not_blank_check check (length(trim(name)) > 0),
  add constraint training_programs_date_order_check check (end_date >= start_date),
  add constraint training_programs_status_check
    check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'));

create index training_programs_race_goal_idx on public.training_programs (race_goal_id);
create index training_programs_created_by_idx on public.training_programs (created_by);
create index training_programs_status_idx on public.training_programs (status);

alter table public.training_weeks
  add column phase text,
  add column updated_at timestamptz;

update public.training_weeks
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(created_at, now());

alter table public.training_weeks
  alter column phase set not null,
  alter column start_date set not null,
  alter column end_date set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint training_weeks_number_positive_check check (week_number > 0),
  add constraint training_weeks_phase_not_blank_check check (length(trim(phase)) > 0),
  add constraint training_weeks_date_order_check check (end_date = start_date + 6),
  add constraint training_weeks_monday_start_check check (extract(isodow from start_date) = 1),
  add constraint training_weeks_sunday_end_check check (extract(isodow from end_date) = 7);

create index training_weeks_program_date_idx
  on public.training_weeks (training_program_id, start_date);

alter table public.training_prescriptions
  add column training_menu text,
  add column updated_at timestamptz;

update public.training_prescriptions
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(created_at, now());

alter table public.training_prescriptions
  alter column training_menu set not null,
  alter column scheduled_date set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint training_prescriptions_menu_check
    check (training_menu in ('EASY', 'SPEED', 'STRENGTH', 'MEDIUM', 'LONG')),
  add constraint training_prescriptions_title_not_blank_check check (length(trim(title)) > 0);

create index training_prescriptions_week_date_idx
  on public.training_prescriptions (training_week_id, scheduled_date);

alter table public.prescription_components rename column distance_km to target_distance_km_legacy;
alter table public.prescription_components rename column duration_minutes to target_duration_minutes_legacy;
alter table public.prescription_components rename column recovery_seconds to recovery_duration_sec;
alter table public.prescription_components rename column notes to instruction;

alter table public.prescription_components
  add column target_distance_m integer,
  add column target_duration_sec integer,
  add column distance_per_rep_m integer,
  add column target_pace_min_sec_per_km integer,
  add column target_pace_max_sec_per_km integer,
  add column updated_at timestamptz;

update public.prescription_components
set target_distance_m = case
      when target_distance_km_legacy is null then null
      else round(target_distance_km_legacy * 1000)::integer
    end,
    target_duration_sec = case
      when target_duration_minutes_legacy is null then null
      else target_duration_minutes_legacy * 60
    end,
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(created_at, now());

alter table public.prescription_components
  drop column target_distance_km_legacy,
  drop column target_duration_minutes_legacy,
  drop column target_pace,
  drop column target_hr_zone,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint prescription_components_sequence_positive_check check (sequence_order > 0),
  add constraint prescription_components_type_not_blank_check check (length(trim(component_type)) > 0),
  add constraint prescription_components_target_distance_positive_check
    check (target_distance_m is null or target_distance_m > 0),
  add constraint prescription_components_target_duration_positive_check
    check (target_duration_sec is null or target_duration_sec > 0),
  add constraint prescription_components_repetitions_positive_check
    check (repetitions is null or repetitions > 0),
  add constraint prescription_components_distance_per_rep_positive_check
    check (distance_per_rep_m is null or distance_per_rep_m > 0),
  add constraint prescription_components_recovery_positive_check
    check (recovery_duration_sec is null or recovery_duration_sec > 0),
  add constraint prescription_components_pace_min_positive_check
    check (target_pace_min_sec_per_km is null or target_pace_min_sec_per_km > 0),
  add constraint prescription_components_pace_max_positive_check
    check (target_pace_max_sec_per_km is null or target_pace_max_sec_per_km > 0),
  add constraint prescription_components_pace_order_check
    check (
      target_pace_min_sec_per_km is null
      or target_pace_max_sec_per_km is null
      or target_pace_min_sec_per_km <= target_pace_max_sec_per_km
    ),
  add constraint prescription_components_has_detail_check
    check (
      target_distance_m is not null
      or target_duration_sec is not null
      or repetitions is not null
      or distance_per_rep_m is not null
      or recovery_duration_sec is not null
      or target_pace_min_sec_per_km is not null
      or target_pace_max_sec_per_km is not null
      or nullif(trim(instruction), '') is not null
    ),
  add constraint prescription_components_prescription_sequence_key
    unique (prescription_id, sequence_order);

create table public.training_import_previews (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  race_goal_id uuid not null references public.athlete_race_goals(id) on delete restrict,
  source_hash text not null,
  template_version integer not null,
  payload jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  imported_program_id uuid unique references public.training_programs(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint training_import_previews_source_hash_check
    check (source_hash ~ '^[0-9a-f]{64}$'),
  constraint training_import_previews_version_check check (template_version = 1),
  constraint training_import_previews_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint training_import_previews_warnings_array_check check (jsonb_typeof(warnings) = 'array'),
  constraint training_import_previews_expiry_check check (expires_at > created_at),
  unique (created_by, race_goal_id, source_hash)
);

create index training_import_previews_creator_idx
  on public.training_import_previews (created_by, created_at desc);

create or replace function public.has_role(p_role_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = auth.uid()
      and roles.name = p_role_code
  );
$$;

create or replace function public.validate_training_week_dates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  program_start date;
  program_end date;
begin
  select start_date, end_date
  into program_start, program_end
  from public.training_programs
  where id = new.training_program_id;

  if program_start is null or new.start_date < program_start or new.end_date > program_end then
    raise exception 'Training week must be within program dates' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.validate_training_prescription_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  week_start date;
  week_end date;
begin
  select start_date, end_date
  into week_start, week_end
  from public.training_weeks
  where id = new.training_week_id;

  if week_start is null or new.scheduled_date < week_start or new.scheduled_date > week_end then
    raise exception 'Training prescription date must be within its training week'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.protect_training_program_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Training program identity and provenance are immutable' using errcode = '23514';
  end if;

  if old.status = 'ARCHIVED' then
    raise exception 'Archived training programs are immutable' using errcode = '23514';
  end if;

  if old.status = 'PUBLISHED' and new.status not in ('PUBLISHED', 'ARCHIVED') then
    raise exception 'Published training programs cannot return to draft' using errcode = '23514';
  end if;

  if old.status <> 'DRAFT' and (
    new.race_goal_id is distinct from old.race_goal_id
    or new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
  ) then
    raise exception 'Published training program content is immutable' using errcode = '23514';
  end if;

  if old.status = 'DRAFT' and new.status = 'PUBLISHED' and not exists (
    select 1
    from public.training_weeks
    join public.training_prescriptions
      on training_prescriptions.training_week_id = training_weeks.id
    where training_weeks.training_program_id = old.id
  ) then
    raise exception 'A program needs at least one prescription before publishing'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.training_weeks
    where training_program_id = old.id
      and (start_date < new.start_date or end_date > new.end_date)
  ) then
    raise exception 'Program dates must contain every training week' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists training_programs_set_updated_at on public.training_programs;
create trigger training_programs_set_updated_at
before update on public.training_programs
for each row execute function public.set_updated_at();

drop trigger if exists training_programs_protect_lifecycle on public.training_programs;
create trigger training_programs_protect_lifecycle
before update on public.training_programs
for each row execute function public.protect_training_program_lifecycle();

drop trigger if exists training_weeks_set_updated_at on public.training_weeks;
create trigger training_weeks_set_updated_at
before update on public.training_weeks
for each row execute function public.set_updated_at();

drop trigger if exists training_weeks_validate_dates on public.training_weeks;
create trigger training_weeks_validate_dates
before insert or update on public.training_weeks
for each row execute function public.validate_training_week_dates();

drop trigger if exists training_prescriptions_set_updated_at on public.training_prescriptions;
create trigger training_prescriptions_set_updated_at
before update on public.training_prescriptions
for each row execute function public.set_updated_at();

drop trigger if exists training_prescriptions_validate_date on public.training_prescriptions;
create trigger training_prescriptions_validate_date
before insert or update on public.training_prescriptions
for each row execute function public.validate_training_prescription_date();

drop trigger if exists prescription_components_set_updated_at on public.prescription_components;
create trigger prescription_components_set_updated_at
before update on public.prescription_components
for each row execute function public.set_updated_at();

alter table public.training_import_previews enable row level security;
alter table public.training_import_previews force row level security;

-- M3 extends the M1/M2 read model only for actual training authors.
create policy "profiles_select_training_authors"
on public.profiles
for select
to authenticated
using (public.has_role('COACH') or public.has_role('ADMIN'));

create policy "race_goals_select_training_authors"
on public.athlete_race_goals
for select
to authenticated
using (public.has_role('COACH') or public.has_role('ADMIN'));

create policy "training_programs_select_author_or_published_athlete"
on public.training_programs
for select
to authenticated
using (
  public.has_role('COACH')
  or public.has_role('ADMIN')
  or (
    status = 'PUBLISHED'
    and exists (
      select 1
      from public.athlete_race_goals
      where athlete_race_goals.id = training_programs.race_goal_id
        and athlete_race_goals.athlete_id = (select auth.uid())
    )
  )
);

create policy "training_programs_insert_authors"
on public.training_programs
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'DRAFT'
  and (public.has_role('COACH') or public.has_role('ADMIN'))
);

create policy "training_programs_update_authors"
on public.training_programs
for update
to authenticated
using (
  public.has_role('ADMIN')
  or (public.has_role('COACH') and created_by = (select auth.uid()))
)
with check (
  public.has_role('ADMIN')
  or (public.has_role('COACH') and created_by = (select auth.uid()))
);

create policy "training_programs_delete_draft_authors"
on public.training_programs
for delete
to authenticated
using (
  status = 'DRAFT'
  and (
    public.has_role('ADMIN')
    or (public.has_role('COACH') and created_by = (select auth.uid()))
  )
);

create policy "training_weeks_select_visible_program"
on public.training_weeks
for select
to authenticated
using (
  exists (
    select 1
    from public.training_programs
    where training_programs.id = training_weeks.training_program_id
  )
);

create policy "training_weeks_insert_draft_author"
on public.training_weeks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_programs
    where training_programs.id = training_weeks.training_program_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "training_weeks_update_draft_author"
on public.training_weeks
for update
to authenticated
using (
  exists (
    select 1
    from public.training_programs
    where training_programs.id = training_weeks.training_program_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.training_programs
    where training_programs.id = training_weeks.training_program_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "training_weeks_delete_draft_author"
on public.training_weeks
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_programs
    where training_programs.id = training_weeks.training_program_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "training_prescriptions_select_visible_program"
on public.training_prescriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.training_weeks
    join public.training_programs
      on training_programs.id = training_weeks.training_program_id
    where training_weeks.id = training_prescriptions.training_week_id
  )
);

create policy "training_prescriptions_insert_draft_author"
on public.training_prescriptions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_weeks
    join public.training_programs
      on training_programs.id = training_weeks.training_program_id
    where training_weeks.id = training_prescriptions.training_week_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "training_prescriptions_update_draft_author"
on public.training_prescriptions
for update
to authenticated
using (
  exists (
    select 1
    from public.training_weeks
    join public.training_programs
      on training_programs.id = training_weeks.training_program_id
    where training_weeks.id = training_prescriptions.training_week_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.training_weeks
    join public.training_programs
      on training_programs.id = training_weeks.training_program_id
    where training_weeks.id = training_prescriptions.training_week_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "training_prescriptions_delete_draft_author"
on public.training_prescriptions
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_weeks
    join public.training_programs
      on training_programs.id = training_weeks.training_program_id
    where training_weeks.id = training_prescriptions.training_week_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "prescription_components_select_visible_program"
on public.prescription_components
for select
to authenticated
using (
  exists (
    select 1
    from public.training_prescriptions
    join public.training_weeks on training_weeks.id = training_prescriptions.training_week_id
    join public.training_programs on training_programs.id = training_weeks.training_program_id
    where training_prescriptions.id = prescription_components.prescription_id
  )
);

create policy "prescription_components_insert_draft_author"
on public.prescription_components
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_prescriptions
    join public.training_weeks on training_weeks.id = training_prescriptions.training_week_id
    join public.training_programs on training_programs.id = training_weeks.training_program_id
    where training_prescriptions.id = prescription_components.prescription_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "prescription_components_update_draft_author"
on public.prescription_components
for update
to authenticated
using (
  exists (
    select 1
    from public.training_prescriptions
    join public.training_weeks on training_weeks.id = training_prescriptions.training_week_id
    join public.training_programs on training_programs.id = training_weeks.training_program_id
    where training_prescriptions.id = prescription_components.prescription_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.training_prescriptions
    join public.training_weeks on training_weeks.id = training_prescriptions.training_week_id
    join public.training_programs on training_programs.id = training_weeks.training_program_id
    where training_prescriptions.id = prescription_components.prescription_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "prescription_components_delete_draft_author"
on public.prescription_components
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_prescriptions
    join public.training_weeks on training_weeks.id = training_prescriptions.training_week_id
    join public.training_programs on training_programs.id = training_weeks.training_program_id
    where training_prescriptions.id = prescription_components.prescription_id
      and training_programs.status = 'DRAFT'
      and (
        public.has_role('ADMIN')
        or (
          public.has_role('COACH')
          and training_programs.created_by = (select auth.uid())
        )
      )
  )
);

create policy "training_import_previews_select_own"
on public.training_import_previews
for select
to authenticated
using (
  created_by = (select auth.uid())
  and (public.has_role('COACH') or public.has_role('ADMIN'))
);

create policy "training_import_previews_insert_own"
on public.training_import_previews
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and imported_program_id is null
  and (public.has_role('COACH') or public.has_role('ADMIN'))
);

create policy "training_import_previews_update_own_unconsumed"
on public.training_import_previews
for update
to authenticated
using (
  created_by = (select auth.uid())
  and imported_program_id is null
  and (public.has_role('COACH') or public.has_role('ADMIN'))
)
with check (
  created_by = (select auth.uid())
  and imported_program_id is not null
  and (public.has_role('COACH') or public.has_role('ADMIN'))
);

revoke all on table public.training_programs from public, anon, authenticated;
revoke all on table public.training_weeks from public, anon, authenticated;
revoke all on table public.training_prescriptions from public, anon, authenticated;
revoke all on table public.prescription_components from public, anon, authenticated;
revoke all on table public.training_import_previews from public, anon, authenticated;

grant select on table public.training_programs to authenticated;
grant insert (race_goal_id, name, description, start_date, end_date, created_by, status)
  on table public.training_programs to authenticated;
grant update (race_goal_id, name, description, start_date, end_date, status)
  on table public.training_programs to authenticated;
grant delete on table public.training_programs to authenticated;

grant select on table public.training_weeks to authenticated;
grant insert (training_program_id, week_number, phase, start_date, end_date)
  on table public.training_weeks to authenticated;
grant update (week_number, phase, start_date, end_date)
  on table public.training_weeks to authenticated;
grant delete on table public.training_weeks to authenticated;

grant select on table public.training_prescriptions to authenticated;
grant insert (training_week_id, training_menu, scheduled_date, title, description)
  on table public.training_prescriptions to authenticated;
grant update (training_menu, scheduled_date, title, description)
  on table public.training_prescriptions to authenticated;
grant delete on table public.training_prescriptions to authenticated;

grant select on table public.prescription_components to authenticated;
grant insert (
  prescription_id,
  sequence_order,
  component_type,
  target_distance_m,
  target_duration_sec,
  repetitions,
  distance_per_rep_m,
  recovery_duration_sec,
  target_pace_min_sec_per_km,
  target_pace_max_sec_per_km,
  instruction
) on table public.prescription_components to authenticated;
grant update (
  sequence_order,
  component_type,
  target_distance_m,
  target_duration_sec,
  repetitions,
  distance_per_rep_m,
  recovery_duration_sec,
  target_pace_min_sec_per_km,
  target_pace_max_sec_per_km,
  instruction
) on table public.prescription_components to authenticated;
grant delete on table public.prescription_components to authenticated;

grant select on table public.training_import_previews to authenticated;
grant insert (
  created_by,
  race_goal_id,
  source_hash,
  template_version,
  payload,
  warnings
) on table public.training_import_previews to authenticated;
grant update (imported_program_id) on table public.training_import_previews to authenticated;

create or replace function public.confirm_training_import(p_preview_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  preview_record public.training_import_previews;
  program_id uuid;
  week_id uuid;
  prescription_id uuid;
  week_json jsonb;
  prescription_json jsonb;
  component_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(auth.uid()::text || ':' || p_preview_id::text, 0)
  );

  select * into preview_record
  from public.training_import_previews
  where id = p_preview_id
    and created_by = auth.uid()
  for update;

  if preview_record.id is null then
    raise exception 'Training import preview was not found' using errcode = 'P0002';
  end if;

  if preview_record.imported_program_id is not null then
    return preview_record.imported_program_id;
  end if;

  if preview_record.expires_at <= now() then
    raise exception 'Training import preview has expired' using errcode = '22023';
  end if;

  if preview_record.template_version <> 1
    or jsonb_typeof(preview_record.payload -> 'weeks') <> 'array'
    or jsonb_array_length(preview_record.payload -> 'weeks') = 0
    or jsonb_array_length(preview_record.payload -> 'weeks') > 52
  then
    raise exception 'Training import preview payload is invalid' using errcode = '22023';
  end if;

  insert into public.training_programs (
    race_goal_id,
    name,
    description,
    start_date,
    end_date,
    created_by,
    status
  )
  values (
    preview_record.race_goal_id,
    preview_record.payload ->> 'name',
    nullif(preview_record.payload ->> 'description', ''),
    (preview_record.payload ->> 'startDate')::date,
    (preview_record.payload ->> 'endDate')::date,
    auth.uid(),
    'DRAFT'
  )
  returning id into program_id;

  for week_json in
    select value from jsonb_array_elements(preview_record.payload -> 'weeks')
  loop
    insert into public.training_weeks (
      training_program_id,
      week_number,
      phase,
      start_date,
      end_date
    )
    values (
      program_id,
      (week_json ->> 'weekNumber')::integer,
      week_json ->> 'phase',
      (week_json ->> 'startDate')::date,
      (week_json ->> 'endDate')::date
    )
    returning id into week_id;

    for prescription_json in
      select value from jsonb_array_elements(week_json -> 'prescriptions')
    loop
      insert into public.training_prescriptions (
        training_week_id,
        training_menu,
        scheduled_date,
        title,
        description
      )
      values (
        week_id,
        prescription_json ->> 'trainingMenu',
        (prescription_json ->> 'scheduledDate')::date,
        prescription_json ->> 'title',
        nullif(prescription_json ->> 'description', '')
      )
      returning id into prescription_id;

      for component_json in
        select value from jsonb_array_elements(prescription_json -> 'components')
      loop
        insert into public.prescription_components (
          prescription_id,
          sequence_order,
          component_type,
          target_distance_m,
          target_duration_sec,
          repetitions,
          distance_per_rep_m,
          recovery_duration_sec,
          target_pace_min_sec_per_km,
          target_pace_max_sec_per_km,
          instruction
        )
        values (
          prescription_id,
          (component_json ->> 'sequenceOrder')::integer,
          component_json ->> 'componentType',
          nullif(component_json ->> 'targetDistanceM', '')::integer,
          nullif(component_json ->> 'targetDurationSec', '')::integer,
          nullif(component_json ->> 'repetitions', '')::integer,
          nullif(component_json ->> 'distancePerRepM', '')::integer,
          nullif(component_json ->> 'recoveryDurationSec', '')::integer,
          nullif(component_json ->> 'targetPaceMinSecPerKm', '')::integer,
          nullif(component_json ->> 'targetPaceMaxSecPerKm', '')::integer,
          nullif(component_json ->> 'instruction', '')
        );
      end loop;
    end loop;
  end loop;

  update public.training_import_previews
  set imported_program_id = program_id
  where id = preview_record.id;

  return program_id;
end;
$$;

create or replace function public.create_training_prescription_with_component(
  p_training_week_id uuid,
  p_training_menu text,
  p_scheduled_date date,
  p_title text,
  p_component_type text,
  p_sequence_order integer,
  p_description text default null,
  p_target_distance_m integer default null,
  p_target_duration_sec integer default null,
  p_repetitions integer default null,
  p_distance_per_rep_m integer default null,
  p_recovery_duration_sec integer default null,
  p_target_pace_min_sec_per_km integer default null,
  p_target_pace_max_sec_per_km integer default null,
  p_instruction text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prescription_id uuid;
begin
  insert into public.training_prescriptions (
    training_week_id,
    training_menu,
    scheduled_date,
    title,
    description
  )
  values (
    p_training_week_id,
    p_training_menu,
    p_scheduled_date,
    p_title,
    nullif(trim(p_description), '')
  )
  returning id into prescription_id;

  insert into public.prescription_components (
    prescription_id,
    sequence_order,
    component_type,
    target_distance_m,
    target_duration_sec,
    repetitions,
    distance_per_rep_m,
    recovery_duration_sec,
    target_pace_min_sec_per_km,
    target_pace_max_sec_per_km,
    instruction
  )
  values (
    prescription_id,
    p_sequence_order,
    p_component_type,
    p_target_distance_m,
    p_target_duration_sec,
    p_repetitions,
    p_distance_per_rep_m,
    p_recovery_duration_sec,
    p_target_pace_min_sec_per_km,
    p_target_pace_max_sec_per_km,
    nullif(trim(p_instruction), '')
  );

  return prescription_id;
end;
$$;

revoke execute on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;
revoke execute on function public.validate_training_week_dates() from public, anon, authenticated;
revoke execute on function public.validate_training_prescription_date() from public, anon, authenticated;
revoke execute on function public.protect_training_program_lifecycle() from public, anon, authenticated;
revoke execute on function public.confirm_training_import(uuid) from public, anon;
grant execute on function public.confirm_training_import(uuid) to authenticated;
revoke execute on function public.create_training_prescription_with_component(
  uuid, text, date, text, text, integer, text, integer, integer, integer,
  integer, integer, integer, integer, text
) from public, anon;
grant execute on function public.create_training_prescription_with_component(
  uuid, text, date, text, text, integer, text, integer, integer, integer,
  integer, integer, integer, integer, text
) to authenticated;

-- Activity and claim tables intentionally retain the M2 deny-all lockdown.

commit;
