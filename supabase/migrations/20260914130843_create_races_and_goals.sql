create table public.races (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  race_date date,
  distance_km numeric,
  location text,
  created_at timestamptz default now()
);

create table public.athlete_race_goals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  race_id uuid not null references public.races(id) on delete cascade,

  target_time interval,
  target_pace numeric,
  notes text,

  created_at timestamptz default now(),

  unique (athlete_id, race_id)
);