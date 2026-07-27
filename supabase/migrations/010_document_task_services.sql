-- RemAuto CRM: multi-service line items for document orders (additive, idempotent)

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_tasks'
  ) then
    return;
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_task_services'
  ) then
    create table public.document_task_services (
      id uuid primary key default gen_random_uuid(),
      document_task_id bigint not null references public.document_tasks(id) on delete cascade,
      service_name text not null,
      service_price numeric(12, 2) not null default 0,
      cost_price numeric(12, 2) not null default 0,
      notes text null,
      sort_order integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end $$;

create index if not exists document_task_services_document_task_id_idx
  on public.document_task_services (document_task_id);

create index if not exists document_task_services_sort_order_idx
  on public.document_task_services (document_task_id, sort_order);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_task_services'
  ) and not exists (
    select 1 from pg_trigger
    where tgname = 'document_task_services_updated_at'
      and tgrelid = 'public.document_task_services'::regclass
  ) then
    create trigger document_task_services_updated_at
    before update on public.document_task_services
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

-- RLS (matches document_tasks access model)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_task_services'
  ) then
    alter table public.document_task_services enable row level security;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'document_task_services'
      and policyname = 'Authenticated users can read document task services'
  ) then
    create policy "Authenticated users can read document task services"
      on public.document_task_services for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'document_task_services'
      and policyname = 'Authenticated users can manage document task services'
  ) then
    create policy "Authenticated users can manage document task services"
      on public.document_task_services for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- Backfill legacy single-service rows (idempotent — skip tasks that already have rows)
insert into public.document_task_services (
  document_task_id,
  service_name,
  service_price,
  cost_price,
  sort_order
)
select
  t.id,
  coalesce(
    nullif(trim(t.custom_service_name), ''),
    nullif(trim(t.service_type), ''),
    nullif(trim(t.work_type), ''),
    'Service'
  ) as service_name,
  coalesce(t.service_price, 0),
  coalesce(t.cost_price, 0),
  0
from public.document_tasks t
where not exists (
  select 1
  from public.document_task_services s
  where s.document_task_id = t.id
)
and (
  nullif(trim(t.custom_service_name), '') is not null
  or nullif(trim(t.service_type), '') is not null
  or nullif(trim(t.work_type), '') is not null
  or t.service_price is not null
  or t.cost_price is not null
);
