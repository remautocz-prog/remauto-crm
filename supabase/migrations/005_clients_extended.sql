-- RemAuto CRM: extend public.clients for client module (idempotent)
-- Existing columns preserved: full_name, company, email, phone, address, notes

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clients'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'client_type'
    ) then
      alter table public.clients
        add column client_type text not null default 'individual';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'city'
    ) then
      alter table public.clients add column city text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'postal_code'
    ) then
      alter table public.clients add column postal_code text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'country'
    ) then
      alter table public.clients add column country text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'preferred_language'
    ) then
      alter table public.clients add column preferred_language text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'tax_id'
    ) then
      alter table public.clients add column tax_id text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'vat_id'
    ) then
      alter table public.clients add column vat_id text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clients' and column_name = 'is_active'
    ) then
      alter table public.clients
        add column is_active boolean not null default true;
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'client_type'
  ) and not exists (
    select 1 from pg_constraint where conname = 'clients_client_type_check'
  ) then
    alter table public.clients
      add constraint clients_client_type_check
      check (client_type in ('individual', 'company'));
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'preferred_language'
  ) and not exists (
    select 1 from pg_constraint where conname = 'clients_preferred_language_check'
  ) then
    alter table public.clients
      add constraint clients_preferred_language_check
      check (preferred_language is null or preferred_language in ('ru', 'cs', 'en'));
  end if;
end $$;
