-- RemAuto CRM: align document_tasks.status with application enum (uppercase)
-- Canonical values: NEW, IN_PROGRESS, WAITING_CLIENT, WAITING_OFFICE,
-- COMPLETED, DELIVERED, CANCELLED

do $$
declare
  r record;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'document_tasks'
  ) then
    return;
  end if;

  -- Drop existing CHECK constraints that reference status (update, do not remove checks permanently)
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'document_tasks'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.document_tasks drop constraint %I', r.conname);
  end loop;

  -- Migrate legacy lowercase / alias values to canonical uppercase
  update public.document_tasks
  set status = case lower(trim(status))
    when 'new' then 'NEW'
    when 'in_progress' then 'IN_PROGRESS'
    when 'waiting_client' then 'WAITING_CLIENT'
    when 'waiting_authority' then 'WAITING_OFFICE'
    when 'waiting_office' then 'WAITING_OFFICE'
    when 'completed' then 'COMPLETED'
    when 'delivered' then 'DELIVERED'
    when 'cancelled' then 'CANCELLED'
    when 'open' then 'NEW'
    when 'pending' then 'NEW'
    when 'active' then 'IN_PROGRESS'
    else upper(trim(status))
  end
  where status is not null;

  -- Fallback for any remaining unknown values before re-adding the constraint
  update public.document_tasks
  set status = 'NEW'
  where status is null
     or status not in (
       'NEW', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_OFFICE',
       'COMPLETED', 'DELIVERED', 'CANCELLED'
     );

  alter table public.document_tasks
    alter column status set default 'NEW';

  if not exists (
    select 1 from pg_constraint where conname = 'document_tasks_status_check'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_status_check
      check (status in (
        'NEW', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_OFFICE',
        'COMPLETED', 'DELIVERED', 'CANCELLED'
      ));
  end if;
end $$;
