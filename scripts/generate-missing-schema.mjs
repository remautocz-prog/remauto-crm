#!/usr/bin/env node

/**
 * Inspects the connected Supabase project and writes SQL for missing schema objects.
 *
 * Usage:
 *   node scripts/generate-missing-schema.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");
const outputPath = resolve(root, "supabase/migrations/002_missing_only.sql");

const EXPECTED_TABLES = [
  "cars",
  "clients",
  "documents",
  "detailing_orders",
  "finance_transactions",
  "notifications",
];

const TABLE_SQL = {
  cars: `-- Cars inventory
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
);`,
  clients: `-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`,
  documents: `-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'contract',
  status text not null default 'active' check (status in ('active', 'archived', 'pending')),
  car_id uuid references public.cars(id) on delete set null,
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`,
  detailing_orders: `-- Detailing orders
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
);`,
  finance_transactions: `-- Finance transactions
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null,
  description text,
  car_id uuid references public.cars(id) on delete set null,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);`,
  notifications: `-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);`,
};

const FOLLOW_UP_SQL = `-- Foreign key on documents.client_id (requires clients table)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_client_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end $$;

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'cars_updated_at') then
    create trigger cars_updated_at before update on public.cars
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'documents_updated_at') then
    create trigger documents_updated_at before update on public.documents
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'clients_updated_at') then
    create trigger clients_updated_at before update on public.clients
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'detailing_orders_updated_at') then
    create trigger detailing_orders_updated_at before update on public.detailing_orders
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- Row Level Security
alter table public.cars enable row level security;
alter table public.documents enable row level security;
alter table public.clients enable row level security;
alter table public.detailing_orders enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can read cars' and tablename = 'cars') then
    create policy "Authenticated users can read cars"
      on public.cars for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can manage cars' and tablename = 'cars') then
    create policy "Authenticated users can manage cars"
      on public.cars for all to authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can read documents' and tablename = 'documents') then
    create policy "Authenticated users can read documents"
      on public.documents for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can manage documents' and tablename = 'documents') then
    create policy "Authenticated users can manage documents"
      on public.documents for all to authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can read clients' and tablename = 'clients') then
    create policy "Authenticated users can read clients"
      on public.clients for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can manage clients' and tablename = 'clients') then
    create policy "Authenticated users can manage clients"
      on public.clients for all to authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can read detailing orders' and tablename = 'detailing_orders') then
    create policy "Authenticated users can read detailing orders"
      on public.detailing_orders for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can manage detailing orders' and tablename = 'detailing_orders') then
    create policy "Authenticated users can manage detailing orders"
      on public.detailing_orders for all to authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can read finance' and tablename = 'finance_transactions') then
    create policy "Authenticated users can read finance"
      on public.finance_transactions for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can manage finance' and tablename = 'finance_transactions') then
    create policy "Authenticated users can manage finance"
      on public.finance_transactions for all to authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can read own notifications' and tablename = 'notifications') then
    create policy "Users can read own notifications"
      on public.notifications for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own notifications' and tablename = 'notifications') then
    create policy "Users can update own notifications"
      on public.notifications for update to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Dashboard view
create or replace view public.monthly_profit as
select
  date_trunc('month', transaction_date)::date as month,
  coalesce(sum(case when type = 'income' then amount else 0 end), 0)
    - coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as profit
from public.finance_transactions
group by 1;

grant select on public.monthly_profit to authenticated;
`;

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
  if (!error) return true;
  const message = error.message.toLowerCase();
  if (
    error.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  ) {
    return false;
  }
  // Table exists but query failed for another reason (RLS, permissions, etc.)
  return true;
}

async function main() {
  const env = {
    ...loadEnvFile(resolve(root, ".env.example")),
    ...loadEnvFile(envPath),
    ...process.env,
  };

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project") || key.includes("your-anon")) {
    console.error("Missing Supabase credentials.");
    console.error("Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const existing = [];
  const missing = [];

  for (const table of EXPECTED_TABLES) {
    const exists = await tableExists(supabase, table);
    if (exists) existing.push(table);
    else missing.push(table);
  }

  console.log("Existing tables:", existing.length ? existing.join(", ") : "(none)");
  console.log("Missing tables:", missing.length ? missing.join(", ") : "(none)");

  const sections = [
    "-- RemAuto CRM: generated SQL for missing schema objects",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Existing: ${existing.join(", ") || "none"}`,
    `-- Missing: ${missing.join(", ") || "none"}`,
    "",
    'create extension if not exists "pgcrypto";',
    "",
  ];

  // Create tables in dependency order
  const creationOrder = ["cars", "clients", "documents", "detailing_orders", "finance_transactions", "notifications"];
  for (const table of creationOrder) {
    if (missing.includes(table)) {
      sections.push(TABLE_SQL[table], "");
    }
  }

  if (missing.length === 0) {
    sections.push("-- All expected tables already exist.", "");
  }

  sections.push(FOLLOW_UP_SQL);

  writeFileSync(outputPath, sections.join("\n"), "utf8");
  console.log(`\nWrote migration to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
