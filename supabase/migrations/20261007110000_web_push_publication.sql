begin;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'CLAIM_SUBMITTED', 'CLAIM_REVIEWED', 'PROGRAM_CANCELLATION_REQUESTED',
  'PROGRAM_CANCELLATION_DECIDED', 'PROGRAM_PUBLISHED', 'WEEKLY_PLAN_PUBLISHED'
));

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) between 30 and 2048),
  p256dh text not null check (length(p256dh) between 40 and 512 and p256dh ~ '^[A-Za-z0-9_-]+$'),
  auth_secret text not null check (length(auth_secret) between 12 and 512 and auth_secret ~ '^[A-Za-z0-9_-]+$'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscription_known_endpoint check (
    endpoint ~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
  )
);
create index push_subscriptions_active_user_idx on public.push_subscriptions(user_id)
  where revoked_at is null;
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','IN_FLIGHT','DELIVERED','FAILED','CANCELLED')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  next_attempt_at timestamptz not null default now(),
  last_http_status integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, subscription_id)
);
create index push_deliveries_due_idx on public.push_deliveries(next_attempt_at, id)
  where status in ('PENDING','IN_FLIGHT');
alter table public.push_deliveries enable row level security;
alter table public.push_deliveries force row level security;
revoke all on public.push_deliveries from public, anon, authenticated;

create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing public.push_subscriptions;
  subscription_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 1742));
  if p_endpoint is null or length(p_endpoint) not between 30 and 2048
    or p_endpoint !~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
    or p_p256dh is null or length(p_p256dh) not between 40 and 512 or p_p256dh !~ '^[A-Za-z0-9_-]+$'
    or p_auth is null or length(p_auth) not between 12 and 512 or p_auth !~ '^[A-Za-z0-9_-]+$'
  then raise exception 'Push subscription is invalid' using errcode = '22023'; end if;

  select * into existing from public.push_subscriptions where endpoint = p_endpoint for update;
  if existing.id is not null and existing.user_id <> auth.uid() then
    raise exception 'This browser subscription belongs to another account; unsubscribe first'
      using errcode = '42501';
  end if;
  if existing.id is null and (select count(*) from public.push_subscriptions
    where user_id = auth.uid() and revoked_at is null) >= 5 then
    raise exception 'Too many enabled devices' using errcode = '23514';
  end if;
  if existing.id is null then
    insert into public.push_subscriptions(user_id, endpoint, p256dh, auth_secret)
    values (auth.uid(), p_endpoint, p_p256dh, p_auth) returning id into subscription_id;
  else
    update public.push_subscriptions set p256dh = p_p256dh, auth_secret = p_auth,
      revoked_at = null, updated_at = now() where id = existing.id;
    subscription_id := existing.id;
  end if;
  return subscription_id;
end;
$$;

create function public.push_subscription_is_active(p_endpoint text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.push_subscriptions where endpoint = p_endpoint
      and user_id = auth.uid() and revoked_at is null
  );
$$;

create function public.revoke_push_subscription(p_endpoint text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare subscription_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  update public.push_subscriptions set revoked_at = now(), updated_at = now()
    where endpoint = p_endpoint and user_id = auth.uid() and revoked_at is null
    returning id into subscription_id;
  if subscription_id is not null then
    update public.push_deliveries set status = 'CANCELLED', updated_at = now()
      where push_deliveries.subscription_id = subscription_id and status in ('PENDING','IN_FLIGHT');
  end if;
  return subscription_id is not null;
end;
$$;

-- Sign-out revokes every device for this account if the browser cannot identify
-- its own endpoint. This favors shared-device privacy over retaining push on
-- other devices; browser-side unsubscribe remains a separate best-effort step.
create function public.revoke_all_push_subscriptions()
returns integer language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  update public.push_subscriptions set revoked_at = now(), updated_at = now()
    where user_id = auth.uid() and revoked_at is null;
  get diagnostics changed = row_count;
  update public.push_deliveries delivery set status = 'CANCELLED', updated_at = now()
    from public.push_subscriptions subscription
    where delivery.subscription_id = subscription.id and subscription.user_id = auth.uid()
      and delivery.status in ('PENDING','IN_FLIGHT');
  return changed;
end;
$$;

create function public.enqueue_push_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_deliveries(notification_id, subscription_id)
  select new.id, subscription.id from public.push_subscriptions subscription
  where subscription.user_id = new.recipient_user_id and subscription.revoked_at is null
  on conflict (notification_id, subscription_id) do nothing;
  return new;
end;
$$;
create trigger notifications_enqueue_push after insert on public.notifications
for each row execute function public.enqueue_push_delivery();

create function public.notify_program_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare athlete_id uuid;
begin
  if old.status = 'DRAFT' and new.status = 'PUBLISHED' then
    select goal.athlete_id into athlete_id from public.athlete_race_goals goal where goal.id = new.race_goal_id;
    if athlete_id is not null then
      insert into public.notifications(recipient_user_id, type, event_key, title, body, target_path)
      values (athlete_id, 'PROGRAM_PUBLISHED', 'program-published:' || new.id,
        'Your training program is ready', 'Your coach has published your training program.',
        '/dashboard/training/' || new.id)
      on conflict (event_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;
create trigger training_programs_notify_published after update of status on public.training_programs
for each row execute function public.notify_program_publication();

create function public.notify_week_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare athlete_id uuid;
begin
  if old.planning_status = 'DRAFT' and new.planning_status = 'PUBLISHED'
    and new.end_date >= current_date then
    -- The Program's BEFORE UPDATE lifecycle trigger publishes its initial
    -- weeks while the stored Program still has DRAFT status. Only a later
    -- publication sees PUBLISHED here.
    select goal.athlete_id into athlete_id
    from public.training_programs program
    join public.athlete_race_goals goal on goal.id = program.race_goal_id
    where program.id = new.training_program_id and program.status = 'PUBLISHED';
    if athlete_id is not null then
      insert into public.notifications(recipient_user_id, type, event_key, title, body, target_path)
      values (athlete_id, 'WEEKLY_PLAN_PUBLISHED', 'week-published:' || new.id,
        'Your new training week is ready', 'Your coach has published a new week of training.',
        '/dashboard/training/' || new.training_program_id)
      on conflict (event_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;
create trigger training_weeks_notify_published after update of planning_status on public.training_weeks
for each row execute function public.notify_week_publication();

create function public.claim_push_deliveries(p_limit integer default 10)
returns table (delivery_id uuid, notification_id uuid, endpoint text, p256dh text,
  auth_secret text, title text, body text, target_path text, attempt_number integer)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  return query
  with due as (
    select delivery.id from public.push_deliveries delivery
    join public.push_subscriptions subscription on subscription.id = delivery.subscription_id
    join public.notifications notification on notification.id = delivery.notification_id
    where delivery.status in ('PENDING','IN_FLIGHT') and delivery.next_attempt_at <= now()
      and delivery.attempts < 3
      and subscription.revoked_at is null and subscription.user_id = notification.recipient_user_id
    order by delivery.next_attempt_at, delivery.id
    limit least(greatest(p_limit, 1), 20)
    for update of delivery skip locked
  ), claimed as (
    update public.push_deliveries delivery
    set status = 'IN_FLIGHT', attempts = delivery.attempts + 1,
      next_attempt_at = now() + interval '2 minutes', updated_at = now()
    from due where delivery.id = due.id returning delivery.*
  )
  select claimed.id, notification.id, subscription.endpoint, subscription.p256dh,
    subscription.auth_secret, notification.title, notification.body,
    notification.target_path, claimed.attempts
  from claimed
  join public.notifications notification on notification.id = claimed.notification_id
  join public.push_subscriptions subscription on subscription.id = claimed.subscription_id
  where subscription.revoked_at is null and subscription.user_id = notification.recipient_user_id;
end;
$$;

create function public.finish_push_delivery(p_delivery_id uuid, p_outcome text, p_http_status integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare delivery public.push_deliveries;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  select * into delivery from public.push_deliveries where id = p_delivery_id for update;
  if delivery.id is null or delivery.status <> 'IN_FLIGHT' then return; end if;
  if p_outcome = 'DELIVERED' then
    update public.push_deliveries set status = 'DELIVERED', last_http_status = p_http_status,
      updated_at = now() where id = delivery.id;
  elsif p_outcome = 'GONE' then
    update public.push_subscriptions set revoked_at = now(), updated_at = now()
      where id = delivery.subscription_id and revoked_at is null;
    update public.push_deliveries set status = 'CANCELLED', updated_at = now()
      where subscription_id = delivery.subscription_id and status in ('PENDING','IN_FLIGHT');
  elsif p_outcome = 'RETRY' then
    update public.push_deliveries set status = case when delivery.attempts >= 3 then 'FAILED' else 'PENDING' end,
      next_attempt_at = now() + (case delivery.attempts when 1 then interval '1 minute'
        when 2 then interval '5 minutes' else interval '15 minutes' end),
      last_http_status = p_http_status, updated_at = now() where id = delivery.id;
  else
    update public.push_deliveries set status = 'FAILED', last_http_status = p_http_status,
      updated_at = now() where id = delivery.id;
  end if;
end;
$$;

revoke all on function public.register_push_subscription(text,text,text) from public, anon;
revoke all on function public.push_subscription_is_active(text) from public, anon;
revoke all on function public.revoke_push_subscription(text) from public, anon;
revoke all on function public.revoke_all_push_subscriptions() from public, anon;
grant execute on function public.register_push_subscription(text,text,text) to authenticated;
grant execute on function public.push_subscription_is_active(text) to authenticated;
grant execute on function public.revoke_push_subscription(text) to authenticated;
grant execute on function public.revoke_all_push_subscriptions() to authenticated;
revoke all on function public.enqueue_push_delivery() from public, anon, authenticated;
revoke all on function public.notify_program_publication() from public, anon, authenticated;
revoke all on function public.notify_week_publication() from public, anon, authenticated;
revoke all on function public.claim_push_deliveries(integer) from public, anon, authenticated;
revoke all on function public.finish_push_delivery(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;
grant execute on function public.finish_push_delivery(uuid,text,integer) to service_role;

commit;
