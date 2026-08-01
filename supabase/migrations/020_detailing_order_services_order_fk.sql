-- RemAuto CRM: ensure detailing_order_services.order_id FK to detailing_orders (additive, idempotent)
-- Migration 020
--
-- Migration 018 defines this FK inline on CREATE TABLE, but "create table if not exists"
-- skips table creation when the table already exists. If detailing_order_services was created
-- earlier without the FK (e.g. partial manual run), PostgREST cannot embed
-- detailing_orders -> detailing_order_services and returns PGRST200.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'detailing_order_services'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'detailing_orders'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'detailing_order_services'
      and column_name = 'order_id'
  ) then
    return;
  end if;

  -- Add FK only when no constraint already links order_id -> detailing_orders.id
  if not exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    join pg_class frel on frel.oid = c.confrelid
    where nsp.nspname = 'public'
      and rel.relname = 'detailing_order_services'
      and a.attname = 'order_id'
      and frel.relname = 'detailing_orders'
      and c.contype = 'f'
  ) then
    alter table public.detailing_order_services
      add constraint detailing_order_services_order_id_fkey
      foreign key (order_id) references public.detailing_orders(id) on delete cascade;
  end if;
end $$;

-- Ask PostgREST to reload its schema cache after FK repair.
notify pgrst, 'reload schema';
