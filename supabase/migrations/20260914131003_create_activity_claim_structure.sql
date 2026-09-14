create table public.activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null
    references public.profiles(id)
    on delete cascade,

  activity_date timestamptz not null,
  activity_type text,

  distance_meters numeric,
  duration_seconds integer,
  average_pace numeric,
  average_hr integer,

  source text,
  external_activity_id text,

  created_at timestamptz default now()
);

create table public.training_claims (
  id uuid primary key default gen_random_uuid(),

  athlete_id uuid not null
    references public.profiles(id)
    on delete cascade,

  prescription_id uuid not null
    references public.training_prescriptions(id)
    on delete cascade,

  status text default 'pending',

  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.claim_activities (
  id uuid primary key default gen_random_uuid(),

  training_claim_id uuid not null
    references public.training_claims(id)
    on delete cascade,

  activity_id uuid not null
    references public.activities(id)
    on delete cascade,

  created_at timestamptz default now(),

  unique (training_claim_id, activity_id)
);