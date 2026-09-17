begin;

create or replace function public.update_strava_activity_context(
  p_activity_id uuid,
  p_rpe integer,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_activity_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if p_activity_id is null
    or (p_rpe is not null and p_rpe not between 1 and 10)
    or (p_notes is not null and length(p_notes) > 4000)
  then
    raise exception 'Activity context is invalid' using errcode = '22023';
  end if;

  update public.activities
  set rpe = p_rpe,
      notes = p_notes
  where id = p_activity_id
    and athlete_id = auth.uid()
    and source = 'STRAVA'
  returning id into updated_activity_id;

  if updated_activity_id is null then
    raise exception 'Strava Activity context cannot be updated' using errcode = '42501';
  end if;

  return updated_activity_id;
end;
$$;

revoke all on function public.update_strava_activity_context(uuid, integer, text)
from public, anon, authenticated;
grant execute on function public.update_strava_activity_context(uuid, integer, text)
to authenticated;

commit;
