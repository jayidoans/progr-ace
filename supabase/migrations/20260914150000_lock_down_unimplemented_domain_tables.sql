begin;

alter table public.training_programs enable row level security;
alter table public.training_programs force row level security;
alter table public.training_weeks enable row level security;
alter table public.training_weeks force row level security;
alter table public.training_prescriptions enable row level security;
alter table public.training_prescriptions force row level security;
alter table public.prescription_components enable row level security;
alter table public.prescription_components force row level security;
alter table public.activities enable row level security;
alter table public.activities force row level security;
alter table public.training_claims enable row level security;
alter table public.training_claims force row level security;
alter table public.claim_activities enable row level security;
alter table public.claim_activities force row level security;

revoke all on table public.training_programs from public, anon, authenticated;
revoke all on table public.training_weeks from public, anon, authenticated;
revoke all on table public.training_prescriptions from public, anon, authenticated;
revoke all on table public.prescription_components from public, anon, authenticated;
revoke all on table public.activities from public, anon, authenticated;
revoke all on table public.training_claims from public, anon, authenticated;
revoke all on table public.claim_activities from public, anon, authenticated;

commit;
