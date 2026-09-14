create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.profiles(id) on delete cascade,
  race_goal_id uuid references public.athlete_race_goals(id) on delete set null,

  name text not null,
  description text,
  start_date date,
  end_date date,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  training_program_id uuid not null
    references public.training_programs(id)
    on delete cascade,

  week_number integer not null,
  start_date date,
  end_date date,

  created_at timestamptz default now(),

  unique (training_program_id, week_number)
);

create table public.training_prescriptions (
  id uuid primary key default gen_random_uuid(),
  training_week_id uuid not null
    references public.training_weeks(id)
    on delete cascade,

  scheduled_date date,
  title text not null,
  description text,

  created_at timestamptz default now()
);

create table public.prescription_components (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null
    references public.training_prescriptions(id)
    on delete cascade,

  component_type text not null,
  sequence_order integer not null,

  distance_km numeric,
  duration_minutes integer,
  target_pace text,
  target_hr_zone text,
  repetitions integer,
  recovery_seconds integer,

  notes text,

  created_at timestamptz default now()
);