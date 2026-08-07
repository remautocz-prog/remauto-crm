-- Profiles RBAC: canonical role + active flag on public.profiles
-- Additive, idempotent. Apply manually in Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text;

alter table public.profiles
  add column if not exists is_active boolean not null default true;

update public.profiles
set role = coalesce(role, 'admin')
where role is null;

alter table public.profiles
  alter column role set default 'inactive';

alter table public.profiles
  alter column is_active set default false;

alter table public.profiles
  alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (
        role in (
          'owner',
          'admin',
          'detailing',
          'documents',
          'accountant',
          'lawyer',
          'inactive'
        )
      );
  end if;
end $$;

-- Ensure at least one owner exists when profiles already present.
update public.profiles p
set role = 'owner'
where not exists (
  select 1 from public.profiles where role = 'owner' and is_active = true
)
and p.id = (
  select id
  from public.profiles
  order by created_at asc nulls last, id asc
  limit 1
);

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
  -- Only derive display name from auth metadata. Phone stays on auth.users.raw_user_meta_data.
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

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();

create or replace function public.protect_profile_self_elevation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into actor_role
  from public.profiles
  where id = auth.uid();

  if new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'Users cannot change their own role';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Users cannot change their own active status';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner' and new.role is distinct from old.role then
      if actor_role is distinct from 'owner' then
        raise exception 'Only the owner can change the owner role';
      end if;
    end if;

    if old.role = 'owner'
      and new.is_active = false
      and actor_role is distinct from 'owner' then
      raise exception 'Only the owner can deactivate the owner account';
    end if;

    if old.role = 'owner'
      and new.role is distinct from 'owner'
      and not exists (
        select 1
        from public.profiles
        where role = 'owner'
          and is_active = true
          and id <> old.id
      ) then
      raise exception 'Cannot remove the last active owner';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_self_elevation on public.profiles;

create trigger profiles_protect_self_elevation
before update on public.profiles
for each row execute function public.protect_profile_self_elevation();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when coalesce(p.is_active, false) = false then 'inactive'
    else p.role
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles readable by self or user managers'
  ) then
    create policy "Profiles readable by self or user managers"
      on public.profiles
      for select
      to authenticated
      using (
        id = auth.uid()
        or public.current_user_role() in ('owner', 'admin')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles updatable by owner or admin'
  ) then
    create policy "Profiles updatable by owner or admin"
      on public.profiles
      for update
      to authenticated
      using (
        public.current_user_role() in ('owner', 'admin')
      )
      with check (
        public.current_user_role() in ('owner', 'admin')
      );
  end if;
end $$;

revoke delete on table public.profiles from authenticated;

comment on column public.profiles.role is 'Canonical application role for RBAC.';
comment on column public.profiles.is_active is 'Inactive users cannot access CRM data.';
