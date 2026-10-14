-- Demo-only protection. Apply this file only to the dedicated demo Supabase
-- project after the normal production-schema migrations have been replayed.
-- The single DO statement makes installation atomic and compatible with the
-- guarded local `supabase db query` verification command.
do $installer$
declare
  table_name text;
begin
  execute $ddl$
    create table if not exists public.demo_read_only_users (
      user_id uuid primary key references auth.users(id) on delete cascade,
      created_at timestamptz not null default now()
    )
  $ddl$;
  execute 'alter table public.demo_read_only_users enable row level security';
  execute 'alter table public.demo_read_only_users force row level security';
  execute 'revoke all on table public.demo_read_only_users from public, anon, authenticated';
  execute 'grant select, insert, delete on table public.demo_read_only_users to service_role';

  execute $ddl$
    create or replace function public.prevent_demo_user_domain_mutation()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $function$
    declare
      actor_id uuid := auth.uid();
    begin
      if actor_id is not null and exists (
        select 1
        from public.demo_read_only_users demo_user
        where demo_user.user_id = actor_id
      ) then
        raise exception 'This demonstration account is read-only'
          using errcode = '42501';
      end if;

      return case when tg_op = 'DELETE' then old else new end;
    end;
    $function$
  $ddl$;
  execute 'revoke all on function public.prevent_demo_user_domain_mutation() from public, anon, authenticated';

  foreach table_name in array array[
    'profiles',
    'user_roles',
    'races',
    'athlete_race_goals',
    'training_programs',
    'training_weeks',
    'training_prescriptions',
    'prescription_components',
    'training_import_previews',
    'activities',
    'training_claims',
    'claim_activities',
    'claim_validations',
    'validation_checks',
    'training_week_reviews',
    'training_activity_comments',
    'training_program_cancellation_requests',
    'race_results',
    'notifications',
    'push_subscriptions',
    'push_deliveries',
    'strava_access_permissions',
    'strava_connections',
    'strava_oauth_states'
  ] loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'Demo hardening expected public.% but it does not exist', table_name;
    end if;

    execute format('drop trigger if exists demo_read_only_guard on public.%I', table_name);
    execute format(
      'create trigger demo_read_only_guard before insert or update or delete on public.%I '
      'for each row execute function public.prevent_demo_user_domain_mutation()',
      table_name
    );
  end loop;

  -- Supabase Auth is outside public RLS. Guard identity fields as well so a
  -- visitor cannot change shared credentials or metadata through Auth APIs.
  execute $ddl$
    create or replace function public.prevent_demo_user_auth_mutation()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $function$
    begin
      if exists (
        select 1
        from public.demo_read_only_users demo_user
        where demo_user.user_id = old.id
      ) and (
        to_jsonb(new)->'email' is distinct from to_jsonb(old)->'email'
        or to_jsonb(new)->'phone' is distinct from to_jsonb(old)->'phone'
        or to_jsonb(new)->'encrypted_password' is distinct from to_jsonb(old)->'encrypted_password'
        or to_jsonb(new)->'raw_user_meta_data' is distinct from to_jsonb(old)->'raw_user_meta_data'
        or to_jsonb(new)->'raw_app_meta_data' is distinct from to_jsonb(old)->'raw_app_meta_data'
        or to_jsonb(new)->'email_change' is distinct from to_jsonb(old)->'email_change'
        or to_jsonb(new)->'phone_change' is distinct from to_jsonb(old)->'phone_change'
      ) then
        raise exception 'This demonstration account identity is read-only'
          using errcode = '42501';
      end if;

      return new;
    end;
    $function$
  $ddl$;
  execute 'revoke all on function public.prevent_demo_user_auth_mutation() from public, anon, authenticated';
  execute 'drop trigger if exists demo_read_only_auth_guard on auth.users';
  execute 'create trigger demo_read_only_auth_guard before update on auth.users '
    'for each row execute function public.prevent_demo_user_auth_mutation()';

  -- Visitors must not be able to enroll or remove MFA factors on a shared
  -- account. GoTrue performs these writes outside public RLS, so protect the
  -- owning user explicitly at the Auth table boundary.
  execute $ddl$
    create or replace function public.prevent_demo_user_mfa_mutation()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $function$
    declare
      target_user_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    begin
      if exists (
        select 1
        from public.demo_read_only_users demo_user
        where demo_user.user_id = target_user_id
      ) then
        raise exception 'This demonstration account MFA configuration is read-only'
          using errcode = '42501';
      end if;
      return case when tg_op = 'DELETE' then old else new end;
    end;
    $function$
  $ddl$;
  execute 'revoke all on function public.prevent_demo_user_mfa_mutation() from public, anon, authenticated';
  execute 'drop trigger if exists demo_read_only_mfa_guard on auth.mfa_factors';
  execute 'create trigger demo_read_only_mfa_guard before insert or update or delete on auth.mfa_factors '
    'for each row execute function public.prevent_demo_user_mfa_mutation()';
end;
$installer$;
