-- RemAuto CRM: Detailing module (replaces legacy detailing_orders)
-- Migration 018
-- Safe to run in Supabase SQL Editor. Do not apply automatically.

-- ---------------------------------------------------------------------------
-- Drop legacy detailing_orders (car_id / client_id linked stub schema)
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read detailing orders" on public.detailing_orders;
drop policy if exists "Authenticated users can manage detailing orders" on public.detailing_orders;
drop trigger if exists detailing_orders_updated_at on public.detailing_orders;
drop table if exists public.detailing_orders cascade;

-- ---------------------------------------------------------------------------
-- Detailing services catalogue
-- ---------------------------------------------------------------------------

create table if not exists public.detailing_services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'exterior_program',
    'interior_program',
    'exterior_additional',
    'interior_additional',
    'combined_package',
    'other'
  )),
  name_cs text not null,
  name_ru text not null,
  description_cs text null,
  description_ru text null,
  base_price numeric(12, 2) null check (base_price is null or base_price >= 0),
  max_price numeric(12, 2) null check (max_price is null or max_price >= 0),
  price_type text not null check (price_type in (
    'fixed',
    'from',
    'range',
    'per_item',
    'on_request',
    'custom'
  )),
  unit text null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint detailing_services_range_check check (
    price_type <> 'range'
    or (base_price is not null and max_price is not null and max_price >= base_price)
  )
);

create index if not exists detailing_services_category_sort_idx
  on public.detailing_services (category, sort_order, name_cs);

create index if not exists detailing_services_active_idx
  on public.detailing_services (active)
  where active = true;

-- ---------------------------------------------------------------------------
-- Detailing order number sequences
-- ---------------------------------------------------------------------------

create table if not exists public.detailing_number_sequences (
  prefix text not null,
  year integer not null,
  last_number integer not null default 0,
  primary key (prefix, year)
);

create or replace function public._allocate_detailing_order_number(p_prefix text, p_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
begin
  if p_prefix is null or p_prefix <> 'DT' then
    raise exception 'Invalid detailing order prefix: %', p_prefix using errcode = '22023';
  end if;

  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'Invalid detailing order year: %', p_year using errcode = '22023';
  end if;

  insert into public.detailing_number_sequences (prefix, year, last_number)
  values (p_prefix, p_year, 1)
  on conflict (prefix, year)
  do update set last_number = public.detailing_number_sequences.last_number + 1
  returning last_number into v_num;

  return p_prefix || '-' || p_year::text || '-' || lpad(v_num::text, 4, '0');
end;
$$;

revoke all on function public._allocate_detailing_order_number(text, integer) from public;
revoke all on function public._allocate_detailing_order_number(text, integer) from anon;
revoke all on function public._allocate_detailing_order_number(text, integer) from authenticated;

create or replace function public.next_detailing_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from timezone('UTC', now()))::integer;
begin
  return public._allocate_detailing_order_number('DT', v_year);
end;
$$;

revoke all on function public.next_detailing_order_number() from public;
revoke all on function public.next_detailing_order_number() from anon;
grant execute on function public.next_detailing_order_number() to authenticated;

-- ---------------------------------------------------------------------------
-- Detailing employee settings (linked to profiles)
-- ---------------------------------------------------------------------------

create table if not exists public.detailing_employee_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  active boolean not null default true,
  commission_percent numeric(5, 2) not null default 35
    check (commission_percent >= 0 and commission_percent <= 100),
  display_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists detailing_employee_settings_active_idx
  on public.detailing_employee_settings (active)
  where active = true;

-- ---------------------------------------------------------------------------
-- Detailing orders
-- ---------------------------------------------------------------------------

create table if not exists public.detailing_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_first_name text null,
  customer_last_name text null,
  customer_phone text null,
  vehicle_make_model text not null,
  registration_number text not null,
  vehicle_size text not null default 'standard'
    check (vehicle_size in ('standard', 'suv', 'xxl')),
  surcharge_percent_snapshot numeric(5, 2) not null default 0
    check (surcharge_percent_snapshot >= 0 and surcharge_percent_snapshot <= 100),
  appointment_date date not null,
  appointment_time time not null,
  expected_completion_at timestamptz null,
  actual_completion_at timestamptz null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'ready', 'delivered', 'cancelled')),
  notes text null,
  assigned_employee_id uuid null references public.profiles(id) on delete set null,
  employee_name_snapshot text null,
  employee_commission_percent_snapshot numeric(5, 2) null
    check (
      employee_commission_percent_snapshot is null
      or (
        employee_commission_percent_snapshot >= 0
        and employee_commission_percent_snapshot <= 100
      )
    ),
  employee_commission_amount numeric(12, 2) null
    check (employee_commission_amount is null or employee_commission_amount >= 0),
  payment_method text null check (payment_method in ('cash', 'card', 'bank_transfer', 'other')),
  services_subtotal numeric(12, 2) not null default 0 check (services_subtotal >= 0),
  vehicle_surcharge_amount numeric(12, 2) not null default 0 check (vehicle_surcharge_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  final_price numeric(12, 2) not null default 0 check (final_price >= 0),
  deposit_amount numeric(12, 2) not null default 0 check (deposit_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12, 2) not null default 0 check (remaining_amount >= 0),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partially_paid', 'paid')),
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists detailing_orders_appointment_idx
  on public.detailing_orders (appointment_date, appointment_time);

create index if not exists detailing_orders_status_idx
  on public.detailing_orders (status);

create index if not exists detailing_orders_payment_status_idx
  on public.detailing_orders (payment_status);

create index if not exists detailing_orders_assigned_employee_idx
  on public.detailing_orders (assigned_employee_id);

create index if not exists detailing_orders_registration_idx
  on public.detailing_orders (registration_number);

create index if not exists detailing_orders_order_number_idx
  on public.detailing_orders (order_number);

create index if not exists detailing_orders_search_idx
  on public.detailing_orders using gin (
    to_tsvector(
      'simple',
      coalesce(order_number, '') || ' ' ||
      coalesce(customer_first_name, '') || ' ' ||
      coalesce(customer_last_name, '') || ' ' ||
      coalesce(customer_phone, '') || ' ' ||
      coalesce(registration_number, '') || ' ' ||
      coalesce(vehicle_make_model, '')
    )
  );

-- ---------------------------------------------------------------------------
-- Detailing order line items
-- ---------------------------------------------------------------------------

create table if not exists public.detailing_order_services (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.detailing_orders(id) on delete cascade,
  service_id uuid null references public.detailing_services(id) on delete set null,
  service_name_snapshot text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) null check (unit_price is null or unit_price >= 0),
  total_price numeric(12, 2) not null default 0 check (total_price >= 0),
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists detailing_order_services_order_idx
  on public.detailing_order_services (order_id);

-- ---------------------------------------------------------------------------
-- Detailing expenses register
-- ---------------------------------------------------------------------------

create table if not exists public.detailing_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (category in (
    'chemicals',
    'ppf_material',
    'consumables',
    'equipment',
    'tools',
    'rent',
    'utilities',
    'marketing',
    'other'
  )),
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text null check (payment_method in ('cash', 'card', 'bank_transfer', 'other')),
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists detailing_expenses_date_idx
  on public.detailing_expenses (expense_date desc);

create index if not exists detailing_expenses_category_idx
  on public.detailing_expenses (category);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists detailing_services_updated_at on public.detailing_services;
create trigger detailing_services_updated_at
  before update on public.detailing_services
  for each row execute function public.set_updated_at();

drop trigger if exists detailing_orders_updated_at on public.detailing_orders;
create trigger detailing_orders_updated_at
  before update on public.detailing_orders
  for each row execute function public.set_updated_at();

drop trigger if exists detailing_employee_settings_updated_at on public.detailing_employee_settings;
create trigger detailing_employee_settings_updated_at
  before update on public.detailing_employee_settings
  for each row execute function public.set_updated_at();

drop trigger if exists detailing_expenses_updated_at on public.detailing_expenses;
create trigger detailing_expenses_updated_at
  before update on public.detailing_expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (select/insert/update only — no client delete)
-- ---------------------------------------------------------------------------

alter table public.detailing_services enable row level security;
alter table public.detailing_orders enable row level security;
alter table public.detailing_order_services enable row level security;
alter table public.detailing_employee_settings enable row level security;
alter table public.detailing_expenses enable row level security;
alter table public.detailing_number_sequences enable row level security;

revoke all on table public.detailing_number_sequences from anon;
revoke all on table public.detailing_number_sequences from authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_services'
      and policyname = 'Authenticated users can read detailing services'
  ) then
    create policy "Authenticated users can read detailing services"
      on public.detailing_services for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_services'
      and policyname = 'Authenticated users can insert detailing services'
  ) then
    create policy "Authenticated users can insert detailing services"
      on public.detailing_services for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_services'
      and policyname = 'Authenticated users can update detailing services'
  ) then
    create policy "Authenticated users can update detailing services"
      on public.detailing_services for update to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_orders'
      and policyname = 'Authenticated users can read detailing orders'
  ) then
    create policy "Authenticated users can read detailing orders"
      on public.detailing_orders for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_orders'
      and policyname = 'Authenticated users can insert detailing orders'
  ) then
    create policy "Authenticated users can insert detailing orders"
      on public.detailing_orders for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_orders'
      and policyname = 'Authenticated users can update detailing orders'
  ) then
    create policy "Authenticated users can update detailing orders"
      on public.detailing_orders for update to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_order_services'
      and policyname = 'Authenticated users can read detailing order services'
  ) then
    create policy "Authenticated users can read detailing order services"
      on public.detailing_order_services for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_order_services'
      and policyname = 'Authenticated users can insert detailing order services'
  ) then
    create policy "Authenticated users can insert detailing order services"
      on public.detailing_order_services for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_order_services'
      and policyname = 'Authenticated users can update detailing order services'
  ) then
    create policy "Authenticated users can update detailing order services"
      on public.detailing_order_services for update to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_employee_settings'
      and policyname = 'Authenticated users can read detailing employee settings'
  ) then
    create policy "Authenticated users can read detailing employee settings"
      on public.detailing_employee_settings for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_employee_settings'
      and policyname = 'Authenticated users can insert detailing employee settings'
  ) then
    create policy "Authenticated users can insert detailing employee settings"
      on public.detailing_employee_settings for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_employee_settings'
      and policyname = 'Authenticated users can update detailing employee settings'
  ) then
    create policy "Authenticated users can update detailing employee settings"
      on public.detailing_employee_settings for update to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_expenses'
      and policyname = 'Authenticated users can read detailing expenses'
  ) then
    create policy "Authenticated users can read detailing expenses"
      on public.detailing_expenses for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_expenses'
      and policyname = 'Authenticated users can insert detailing expenses'
  ) then
    create policy "Authenticated users can insert detailing expenses"
      on public.detailing_expenses for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'detailing_expenses'
      and policyname = 'Authenticated users can update detailing expenses'
  ) then
    create policy "Authenticated users can update detailing expenses"
      on public.detailing_expenses for update to authenticated using (true) with check (true);
  end if;
end $$;

revoke delete on table public.detailing_services from authenticated;
revoke delete on table public.detailing_orders from authenticated;
revoke delete on table public.detailing_employee_settings from authenticated;
revoke delete on table public.detailing_expenses from authenticated;
-- order line items may be replaced during order edit (no standalone delete in UI)
