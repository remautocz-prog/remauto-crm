-- RemAuto CRM: Deals module, extended client/car fields, secure deal numbering
-- Migration 016
-- Safe to run in Supabase SQL Editor (additive, idempotent where noted)

-- ---------------------------------------------------------------------------
-- updated_at helper (defined in 001; safe to replace)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Extended client fields for contracts
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists birth_date date null;

alter table public.clients
  add column if not exists personal_id_number text null;

alter table public.clients
  add column if not exists identity_document_number text null;

alter table public.clients
  add column if not exists bank_account text null;

-- ---------------------------------------------------------------------------
-- Extended vehicle fields for contracts
-- ---------------------------------------------------------------------------

alter table public.cars
  add column if not exists first_registration_date date null;

alter table public.cars
  add column if not exists fuel_type text null;

alter table public.cars
  add column if not exists engine_capacity text null;

alter table public.cars
  add column if not exists power_kw numeric(8,2) null;

alter table public.cars
  add column if not exists technical_certificate_number text null;

alter table public.cars
  add column if not exists key_count integer null;

alter table public.cars
  add column if not exists mileage integer null;

-- ---------------------------------------------------------------------------
-- Deal number sequences (no direct authenticated access)
-- ---------------------------------------------------------------------------

create table if not exists public.deal_number_sequences (
  prefix text not null,
  year integer not null,
  last_number integer not null default 0,
  primary key (prefix, year)
);

-- Internal allocator: SECURITY DEFINER, not callable by app users
create or replace function public._allocate_deal_number(p_prefix text, p_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
  v_allowed_prefixes text[] := array['SM', 'SP', 'NK', 'KM', 'ZS', 'KS', 'DL'];
begin
  if p_prefix is null or not (p_prefix = any (v_allowed_prefixes)) then
    raise exception 'Invalid deal number prefix: %', p_prefix using errcode = '22023';
  end if;

  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'Invalid deal number year: %', p_year using errcode = '22023';
  end if;

  insert into public.deal_number_sequences (prefix, year, last_number)
  values (p_prefix, p_year, 1)
  on conflict (prefix, year)
  do update set last_number = public.deal_number_sequences.last_number + 1
  returning last_number into v_num;

  return p_prefix || '-' || p_year::text || '-' || lpad(v_num::text, 4, '0');
end;
$$;

revoke all on function public._allocate_deal_number(text, integer) from public;
revoke all on function public._allocate_deal_number(text, integer) from anon;
revoke all on function public._allocate_deal_number(text, integer) from authenticated;

-- Public API: prefix derived from deal_type (no arbitrary prefix from clients)
create or replace function public.next_deal_number_for_deal_type(p_deal_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_year integer := extract(year from timezone('UTC', now()))::integer;
begin
  v_prefix := case p_deal_type
    when 'vehicle_exchange_with_additional_payment' then 'SM'
    when 'vehicle_sale' then 'SP'
    when 'vehicle_purchase' then 'NK'
    when 'commission_sale' then 'KM'
    when 'brokerage' then 'ZS'
    when 'consignment' then 'KS'
    when 'custom' then 'DL'
    else null
  end;

  if v_prefix is null then
    raise exception 'Unsupported deal type: %', p_deal_type using errcode = '22023';
  end if;

  return public._allocate_deal_number(v_prefix, v_year);
end;
$$;

revoke all on function public.next_deal_number_for_deal_type(text) from public;
revoke all on function public.next_deal_number_for_deal_type(text) from anon;
grant execute on function public.next_deal_number_for_deal_type(text) to authenticated;

drop function if exists public.next_deal_number(text, integer);

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_number text unique not null,
  deal_type text not null,
  status text not null default 'draft',
  client_id bigint null references public.clients(id) on delete set null,
  vehicle_a_id bigint null references public.cars(id) on delete set null,
  vehicle_b_id bigint null references public.cars(id) on delete set null,
  vehicle_a_source text not null default 'crm',
  vehicle_b_source text not null default 'crm',
  vehicle_a_snapshot jsonb not null default '{}'::jsonb,
  vehicle_b_snapshot jsonb not null default '{}'::jsonb,
  client_snapshot jsonb not null default '{}'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  vehicle_a_value numeric(14,2) null,
  vehicle_b_value numeric(14,2) null,
  additional_payment numeric(14,2) null,
  additional_payment_words text null,
  currency text not null default 'CZK',
  additional_payment_payer text null,
  payment_method text null,
  payment_account text null,
  payment_due_date date null,
  payment_paid_at timestamptz null,
  payment_status text not null default 'unpaid',
  custom_payment_method text null,
  signing_place text null,
  signing_date date null,
  vehicle_a_known_defects text null,
  vehicle_b_known_defects text null,
  legal_defects_notes text null,
  service_budget numeric(14,2) null,
  additional_terms text null,
  handover_date date null,
  handover_time time null,
  handover_place text null,
  handover_notes text null,
  cancelled_reason text null,
  signed_at timestamptz null,
  assigned_to uuid null references public.profiles(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_deal_type_check check (
    deal_type in (
      'vehicle_exchange_with_additional_payment',
      'vehicle_sale',
      'vehicle_purchase',
      'commission_sale',
      'brokerage',
      'consignment',
      'custom'
    )
  ),
  constraint deals_status_check check (
    status in (
      'draft',
      'prepared',
      'signed',
      'in_progress',
      'completed',
      'cancelled',
      'archived'
    )
  ),
  constraint deals_vehicle_a_source_check check (
    vehicle_a_source in ('crm', 'external')
  ),
  constraint deals_vehicle_b_source_check check (
    vehicle_b_source in ('crm', 'external')
  ),
  constraint deals_additional_payment_payer_check check (
    additional_payment_payer is null
    or additional_payment_payer in ('remauto', 'customer', 'none')
  ),
  constraint deals_payment_method_check check (
    payment_method is null
    or payment_method in ('cash', 'bank_transfer', 'financing', 'other')
  ),
  constraint deals_payment_status_check check (
    payment_status in (
      'unpaid',
      'partially_paid',
      'paid',
      'overdue',
      'not_applicable'
    )
  ),
  constraint deals_currency_check check (
    currency in ('CZK', 'EUR')
  )
);

-- Additive integrity constraints on deals (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_vehicle_a_value_nonneg'
  ) then
    alter table public.deals
      add constraint deals_vehicle_a_value_nonneg
      check (vehicle_a_value is null or vehicle_a_value >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_vehicle_b_value_nonneg'
  ) then
    alter table public.deals
      add constraint deals_vehicle_b_value_nonneg
      check (vehicle_b_value is null or vehicle_b_value >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_additional_payment_nonneg'
  ) then
    alter table public.deals
      add constraint deals_additional_payment_nonneg
      check (additional_payment is null or additional_payment >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_service_budget_nonneg'
  ) then
    alter table public.deals
      add constraint deals_service_budget_nonneg
      check (service_budget is null or service_budget >= 0);
  end if;
end $$;

create index if not exists deals_client_id_idx
  on public.deals (client_id);

create index if not exists deals_vehicle_a_id_idx
  on public.deals (vehicle_a_id);

create index if not exists deals_vehicle_b_id_idx
  on public.deals (vehicle_b_id);

create index if not exists deals_status_idx
  on public.deals (status);

create index if not exists deals_payment_status_idx
  on public.deals (payment_status);

create index if not exists deals_assigned_to_idx
  on public.deals (assigned_to);

create index if not exists deals_signing_date_idx
  on public.deals (signing_date);

create index if not exists deals_archived_at_idx
  on public.deals (archived_at);

create index if not exists deals_created_at_idx
  on public.deals (created_at desc);

-- deal_number UNIQUE already creates an index
drop index if exists public.deals_deal_number_idx;

-- ---------------------------------------------------------------------------
-- Handover protocol details per vehicle side
-- ---------------------------------------------------------------------------

create table if not exists public.deal_handover_details (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  vehicle_side text not null,
  handover_datetime timestamptz null,
  mileage integer null,
  fuel_level text null,
  key_count integer null,
  documents jsonb not null default '[]'::jsonb,
  accessories text null,
  visible_damage text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_handover_details_vehicle_side_check check (
    vehicle_side in ('vehicle_a', 'vehicle_b')
  ),
  constraint deal_handover_details_deal_side_unique unique (deal_id, vehicle_side)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deal_handover_details_mileage_nonneg'
  ) then
    alter table public.deal_handover_details
      add constraint deal_handover_details_mileage_nonneg
      check (mileage is null or mileage >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deal_handover_details_key_count_nonneg'
  ) then
    alter table public.deal_handover_details
      add constraint deal_handover_details_key_count_nonneg
      check (key_count is null or key_count >= 0);
  end if;
end $$;

create index if not exists deal_handover_details_deal_id_idx
  on public.deal_handover_details (deal_id);

-- ---------------------------------------------------------------------------
-- Car integrity constraints (idempotent)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cars_key_count_nonneg'
  ) then
    alter table public.cars
      add constraint cars_key_count_nonneg
      check (key_count is null or key_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cars_mileage_nonneg'
  ) then
    alter table public.cars
      add constraint cars_mileage_nonneg
      check (mileage is null or mileage >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cars_power_kw_nonneg'
  ) then
    alter table public.cars
      add constraint cars_power_kw_nonneg
      check (power_kw is null or power_kw >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Link generated documents to deals
-- ---------------------------------------------------------------------------

alter table public.generated_documents
  add column if not exists deal_id uuid null references public.deals(id) on delete set null;

create index if not exists generated_documents_deal_id_idx
  on public.generated_documents (deal_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'deals_updated_at'
      and tgrelid = 'public.deals'::regclass
  ) then
    create trigger deals_updated_at
      before update on public.deals
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'deal_handover_details_updated_at'
      and tgrelid = 'public.deal_handover_details'::regclass
  ) then
    create trigger deal_handover_details_updated_at
      before update on public.deal_handover_details
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.deals enable row level security;
alter table public.deal_handover_details enable row level security;
alter table public.deal_number_sequences enable row level security;

revoke all on table public.deal_number_sequences from anon;
revoke all on table public.deal_number_sequences from authenticated;

do $$
begin
  drop policy if exists "Authenticated users can manage deals"
    on public.deals;

  drop policy if exists "Authenticated users can manage deal handover details"
    on public.deal_handover_details;

  drop policy if exists "Authenticated users can manage deal number sequences"
    on public.deal_number_sequences;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deals'
      and policyname = 'Authenticated users can read deals'
  ) then
    create policy "Authenticated users can read deals"
      on public.deals
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deals'
      and policyname = 'Authenticated users can insert deals'
  ) then
    create policy "Authenticated users can insert deals"
      on public.deals
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deals'
      and policyname = 'Authenticated users can update deals'
  ) then
    create policy "Authenticated users can update deals"
      on public.deals
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deal_handover_details'
      and policyname = 'Authenticated users can read deal handover details'
  ) then
    create policy "Authenticated users can read deal handover details"
      on public.deal_handover_details
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deal_handover_details'
      and policyname = 'Authenticated users can insert deal handover details'
  ) then
    create policy "Authenticated users can insert deal handover details"
      on public.deal_handover_details
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deal_handover_details'
      and policyname = 'Authenticated users can update deal handover details'
  ) then
    create policy "Authenticated users can update deal handover details"
      on public.deal_handover_details
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
