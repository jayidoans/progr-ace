begin;

alter table public.training_programs
  add column tracking_start_date date not null default current_date;

-- Preserve existing evaluation behavior for Programs created before this field
-- existed. New Programs use today's date as the start of ProgrACE tracking,
-- independently from their training-plan start date.
update public.training_programs
set tracking_start_date = created_at::date;

alter table public.training_programs
  add constraint training_programs_tracking_start_date_check
  check (tracking_start_date is not null);

commit;
