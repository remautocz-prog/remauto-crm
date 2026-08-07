-- Repair auth.users -> profiles trigger after manual 025 apply.
-- Additive, idempotent. Apply manually in Supabase SQL Editor.
--
-- Problem:
--   inviteUserByEmail inserts auth.users, firing a profile trigger that attempted
--   to copy raw_user_meta_data.role (or a non-CRM fallback such as "user") into
--   public.profiles.role, violating profiles_role_check.
--
-- Fix:
--   Always insert role = 'inactive', is_active = false from the trigger.
--   inviteManagedUserAction upserts the selected CRM role with the service role.

create or replace function public.safe_initial_profile_role()
returns text
language sql
immutable
set search_path = public
as $$
  select 'inactive'::text;
$$;

comment on function public.safe_initial_profile_role() is
  'Canonical initial CRM role for auth.users -> profiles trigger inserts. Never read raw_user_meta_data.role.';

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_full_name text;
begin
  -- Preserve id (new.id), full_name, created_at, updated_at.
  -- Phone is stored on auth.users.raw_user_meta_data.phone by the invite action.
  profile_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if profile_full_name is null then
    profile_full_name := nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '');
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.id,
    profile_full_name,
    public.safe_initial_profile_role(),
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user_profile() is
  'Creates an inactive CRM profile when auth.users row is inserted. Role/active are set later by server-side invite upsert.';

-- Remove legacy/competing trigger names, then recreate the canonical trigger.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Safer defaults if any code inserts into profiles without explicit role/active.
alter table public.profiles
  alter column role set default 'inactive';

alter table public.profiles
  alter column is_active set default false;

-- Optional inspection (run manually after apply):
-- select tgname, pg_get_triggerdef(t.oid)
-- from pg_trigger t
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;
--
-- select pg_get_functiondef('public.handle_new_user_profile()'::regprocedure);
