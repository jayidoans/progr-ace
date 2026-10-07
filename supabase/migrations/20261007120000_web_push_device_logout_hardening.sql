begin;

-- Preserve the authenticated-owner check and pending-delivery cancellation,
-- but disambiguate the PL/pgSQL variable from push_deliveries.subscription_id.
create or replace function public.revoke_push_subscription(p_endpoint text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_subscription_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  update public.push_subscriptions set revoked_at = now(), updated_at = now()
    where endpoint = p_endpoint and user_id = auth.uid() and revoked_at is null
    returning id into v_subscription_id;
  if v_subscription_id is not null then
    update public.push_deliveries delivery set status = 'CANCELLED', updated_at = now()
      where delivery.subscription_id = v_subscription_id
        and delivery.status in ('PENDING','IN_FLIGHT');
  end if;
  return v_subscription_id is not null;
end;
$$;

commit;
