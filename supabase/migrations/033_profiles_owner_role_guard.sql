-- RemAuto CRM: prevent admin (or any non-owner) from assigning owner role via direct UPDATE
-- Apply manually in Supabase SQL Editor after 025 (and 032 if present).
-- Idempotent. Service-role invite/profile upsert unchanged (auth.uid() is null).
--
-- Root cause:
-- protect_profile_self_elevation blocked changing an existing owner's role but allowed
-- admin to UPDATE another user's profile.role to 'owner'.

create or replace function public.protect_profile_self_elevation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_is_active boolean;
begin
  -- Service role / trigger inserts (invite upsert) run without an end-user JWT.
  if auth.uid() is null then
    return new;
  end if;

  select role, is_active
  into actor_role, actor_is_active
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_is_active, false) = false then
    raise exception 'Inactive users cannot modify profiles';
  end if;

  if new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'Users cannot change their own role';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Users cannot change their own active status';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Only an active owner may assign owner role to another user.
    if new.role = 'owner' and old.role is distinct from 'owner' then
      if actor_role is distinct from 'owner' then
        raise exception 'Only the owner can assign the owner role';
      end if;
    end if;

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

comment on function public.protect_profile_self_elevation() is
  'Blocks self-elevation, admin->owner promotion, and non-owner edits to owner accounts. Skipped when auth.uid() is null (service role).';

drop trigger if exists profiles_protect_self_elevation on public.profiles;

create trigger profiles_protect_self_elevation
before update on public.profiles
for each row execute function public.protect_profile_self_elevation();
