-- RemAuto CRM: idempotent migration aligned with existing bigint schema
-- Existing tables (do not recreate): cars, clients, car_expenses, document_tasks, detailing_orders
-- All PKs on business tables use bigint identity; UUID only for auth.users / profiles references.
-- Safe to run after a previous partial failure.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Repair partially applied UUID columns from a previous failed migration
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'car_id'
      and udt_name = 'uuid'
  ) then
    alter table public.documents drop constraint if exists documents_car_id_fkey;
    alter table public.documents
      alter column car_id type bigint using null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'client_id'
      and udt_name = 'uuid'
  ) then
    alter table public.documents drop constraint if exists documents_client_id_fkey;
    alter table public.documents
      alter column client_id type bigint using null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'finance_transactions'
      and column_name = 'car_id'
      and udt_name = 'uuid'
  ) then
    alter table public.finance_transactions drop constraint if exists finance_transactions_car_id_fkey;
    alter table public.finance_transactions
      alter column car_id type bigint using null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- New CRM tables only (never recreate cars, clients, detailing_orders, etc.)
-- ---------------------------------------------------------------------------

create table if not exists public.documents (
  id bigint generated always as identity primary key,
  title text not null,
  type text not null default 'contract',
  status text not null default 'active' check (status in ('active', 'archived', 'pending')),
  car_id bigint,
  client_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id bigint generated always as identity primary key,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null,
  description text,
  car_id bigint,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Foreign keys (bigint -> cars.id / clients.id; uuid -> auth.users only)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cars'
  ) and not exists (
    select 1 from pg_constraint where conname = 'documents_car_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_car_id_fkey
      foreign key (car_id) references public.cars(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clients'
  ) and not exists (
    select 1 from pg_constraint where conname = 'documents_client_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cars'
  ) and not exists (
    select 1 from pg_constraint where conname = 'finance_transactions_car_id_fkey'
  ) then
    alter table public.finance_transactions
      add constraint finance_transactions_car_id_fkey
      foreign key (car_id) references public.cars(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers only when the table and updated_at column exist
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'updated_at'
  ) and not exists (select 1 from pg_trigger where tgname = 'cars_updated_at') then
    create trigger cars_updated_at before update on public.cars
      for each row execute function public.set_updated_at();
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'updated_at'
  ) and not exists (select 1 from pg_trigger where tgname = 'clients_updated_at') then
    create trigger clients_updated_at before update on public.clients
      for each row execute function public.set_updated_at();
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'detailing_orders' and column_name = 'updated_at'
  ) and not exists (select 1 from pg_trigger where tgname = 'detailing_orders_updated_at') then
    create trigger detailing_orders_updated_at before update on public.detailing_orders
      for each row execute function public.set_updated_at();
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'updated_at'
  ) and not exists (select 1 from pg_trigger where tgname = 'documents_updated_at') then
    create trigger documents_updated_at before update on public.documents
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'cars',
    'clients',
    'car_expenses',
    'document_tasks',
    'detailing_orders',
    'documents',
    'finance_transactions',
    'notifications'
  ]
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      execute format('alter table public.%I enable row level security', tbl);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Policies (skip if already present)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cars') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cars' and policyname = 'Authenticated users can read cars') then
      create policy "Authenticated users can read cars"
        on public.cars for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cars' and policyname = 'Authenticated users can manage cars') then
      create policy "Authenticated users can manage cars"
        on public.cars for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'clients') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'Authenticated users can read clients') then
      create policy "Authenticated users can read clients"
        on public.clients for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'Authenticated users can manage clients') then
      create policy "Authenticated users can manage clients"
        on public.clients for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'detailing_orders') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'detailing_orders' and policyname = 'Authenticated users can read detailing orders') then
      create policy "Authenticated users can read detailing orders"
        on public.detailing_orders for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'detailing_orders' and policyname = 'Authenticated users can manage detailing orders') then
      create policy "Authenticated users can manage detailing orders"
        on public.detailing_orders for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'car_expenses') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'car_expenses' and policyname = 'Authenticated users can read car expenses') then
      create policy "Authenticated users can read car expenses"
        on public.car_expenses for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'car_expenses' and policyname = 'Authenticated users can manage car expenses') then
      create policy "Authenticated users can manage car expenses"
        on public.car_expenses for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_tasks') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_tasks' and policyname = 'Authenticated users can read document tasks') then
      create policy "Authenticated users can read document tasks"
        on public.document_tasks for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_tasks' and policyname = 'Authenticated users can manage document tasks') then
      create policy "Authenticated users can manage document tasks"
        on public.document_tasks for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'documents') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'Authenticated users can read documents') then
      create policy "Authenticated users can read documents"
        on public.documents for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'Authenticated users can manage documents') then
      create policy "Authenticated users can manage documents"
        on public.documents for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'finance_transactions') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'finance_transactions' and policyname = 'Authenticated users can read finance') then
      create policy "Authenticated users can read finance"
        on public.finance_transactions for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'finance_transactions' and policyname = 'Authenticated users can manage finance') then
      create policy "Authenticated users can manage finance"
        on public.finance_transactions for all to authenticated using (true) with check (true);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notifications') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can read own notifications') then
      create policy "Users can read own notifications"
        on public.notifications for select to authenticated using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can update own notifications') then
      create policy "Users can update own notifications"
        on public.notifications for update to authenticated using (auth.uid() = user_id);
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Dashboard view (only when finance_transactions exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'finance_transactions'
  ) and not exists (
    select 1 from information_schema.views
    where table_schema = 'public' and table_name = 'monthly_profit'
  ) then
    execute $view$
      create view public.monthly_profit as
      select
        date_trunc('month', transaction_date)::date as month,
        coalesce(sum(case when type = 'income' then amount else 0 end), 0)
          - coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as profit
      from public.finance_transactions
      group by 1
    $view$;

    grant select on public.monthly_profit to authenticated;
  end if;
end $$;
