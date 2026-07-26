-- RemAuto CRM: add business model columns to public.cars (idempotent)
-- Safe to run on existing bigint identity schema. Does not modify existing row data.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cars'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'business_model'
    ) then
      alter table public.cars
        add column business_model text not null default 'owned';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'commission_type'
    ) then
      alter table public.cars
        add column commission_type text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'commission_value'
    ) then
      alter table public.cars
        add column commission_value numeric(12, 2) null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'owner_net_amount'
    ) then
      alter table public.cars
        add column owner_net_amount numeric(12, 2) null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'owner_client_id'
    ) then
      alter table public.cars
        add column owner_client_id bigint null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'contract_end_date'
    ) then
      alter table public.cars
        add column contract_end_date date null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cars'
        and column_name = 'contract_document_url'
    ) then
      alter table public.cars
        add column contract_document_url text null;
    end if;
  end if;
end $$;

-- Foreign key: owner_client_id -> clients.id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cars'
      and column_name = 'owner_client_id'
  ) and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clients'
  ) and not exists (
    select 1 from pg_constraint where conname = 'cars_owner_client_id_fkey'
  ) then
    alter table public.cars
      add constraint cars_owner_client_id_fkey
      foreign key (owner_client_id) references public.clients(id) on delete set null;
  end if;
end $$;

-- Check constraints
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cars'
      and column_name = 'business_model'
  ) and not exists (
    select 1 from pg_constraint where conname = 'cars_business_model_check'
  ) then
    alter table public.cars
      add constraint cars_business_model_check
      check (business_model in ('owned', 'commission', 'client_order'));
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cars'
      and column_name = 'commission_type'
  ) and not exists (
    select 1 from pg_constraint where conname = 'cars_commission_type_check'
  ) then
    alter table public.cars
      add constraint cars_commission_type_check
      check (commission_type is null or commission_type in ('fixed', 'percentage'));
  end if;
end $$;
