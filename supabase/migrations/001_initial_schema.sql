-- RemAuto CRM initial schema
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists "pgcrypto";

-- Cars inventory
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year integer not null,
  vin text unique,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold', 'reserved')),
  purchase_price numeric(12, 2),
  sale_price numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents (contracts, registrations, etc.)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'contract',
  status text not null default 'active' check (status in ('active', 'archived', 'pending')),
  car_id uuid references public.cars(id) on delete set null,
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents
  add constraint documents_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

-- Detailing orders
create table if not exists public.detailing_orders (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references public.cars(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  service_type text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  price numeric(12, 2) not null default 0,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Finance transactions
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null,
  description text,
  car_id uuid references public.cars(id) on delete set null,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cars_updated_at before update on public.cars
  for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger detailing_orders_updated_at before update on public.detailing_orders
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.cars enable row level security;
alter table public.documents enable row level security;
alter table public.clients enable row level security;
alter table public.detailing_orders enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.notifications enable row level security;

create policy "Authenticated users can read cars"
  on public.cars for select to authenticated using (true);
create policy "Authenticated users can manage cars"
  on public.cars for all to authenticated using (true) with check (true);

create policy "Authenticated users can read documents"
  on public.documents for select to authenticated using (true);
create policy "Authenticated users can manage documents"
  on public.documents for all to authenticated using (true) with check (true);

create policy "Authenticated users can read clients"
  on public.clients for select to authenticated using (true);
create policy "Authenticated users can manage clients"
  on public.clients for all to authenticated using (true) with check (true);

create policy "Authenticated users can read detailing orders"
  on public.detailing_orders for select to authenticated using (true);
create policy "Authenticated users can manage detailing orders"
  on public.detailing_orders for all to authenticated using (true) with check (true);

create policy "Authenticated users can read finance"
  on public.finance_transactions for select to authenticated using (true);
create policy "Authenticated users can manage finance"
  on public.finance_transactions for all to authenticated using (true) with check (true);

create policy "Users can read own notifications"
  on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users can update own notifications"
  on public.notifications for update to authenticated using (auth.uid() = user_id);

-- Dashboard views (optional helper for monthly profit)
create or replace view public.monthly_profit as
select
  date_trunc('month', transaction_date)::date as month,
  coalesce(sum(case when type = 'income' then amount else 0 end), 0)
    - coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as profit
from public.finance_transactions
group by 1;

grant select on public.monthly_profit to authenticated;
