begin;

create or replace function public.get_authorized_program_claim_states(
  p_program_ids uuid[]
)
returns table (
  program_id uuid,
  prescription_id uuid,
  claim_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean;
  is_coach boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_program_ids is null
    or cardinality(p_program_ids) = 0
    or cardinality(p_program_ids) > 20
    or array_position(p_program_ids, null) is not null
  then
    raise exception 'Program selection is invalid' using errcode = '22023';
  end if;

  select
    coalesce(bool_or(roles.name = 'ADMIN'), false),
    coalesce(bool_or(roles.name = 'COACH'), false)
  into is_admin, is_coach
  from public.user_roles
  join public.roles on roles.id = user_roles.role_id
  where user_roles.user_id = current_user_id;

  if not is_admin and not is_coach then
    raise exception 'Program evaluation access is unavailable' using errcode = '42501';
  end if;

  return query
  select
    program.id,
    prescription.id,
    claim.status
  from public.training_programs program
  join public.training_weeks week on week.training_program_id = program.id
  join public.training_prescriptions prescription on prescription.training_week_id = week.id
  left join public.training_claims claim on claim.prescription_id = prescription.id
  where program.id = any(p_program_ids)
    and (is_admin or (is_coach and program.created_by = current_user_id));
end;
$$;

revoke all on function public.get_authorized_program_claim_states(uuid[])
from public, anon, authenticated;
grant execute on function public.get_authorized_program_claim_states(uuid[])
to authenticated;

commit;
