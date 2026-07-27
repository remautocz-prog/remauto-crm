-- RemAuto CRM: extend public.document_tasks for document workflow (idempotent)
-- Existing columns preserved: id, status, deadline, notes, client_id, car_id,
-- paid_amount, document_count, created_at, updated_at

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_tasks'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'service_type'
    ) then
      alter table public.document_tasks add column service_type text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'custom_service_name'
    ) then
      alter table public.document_tasks add column custom_service_name text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'assigned_to'
    ) then
      alter table public.document_tasks add column assigned_to uuid null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'priority'
    ) then
      alter table public.document_tasks
        add column priority text not null default 'normal';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'started_at'
    ) then
      alter table public.document_tasks add column started_at date null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'due_date'
    ) then
      alter table public.document_tasks add column due_date date null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'completed_at'
    ) then
      alter table public.document_tasks add column completed_at date null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'service_price'
    ) then
      alter table public.document_tasks add column service_price numeric(12, 2) null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'cost_price'
    ) then
      alter table public.document_tasks add column cost_price numeric(12, 2) null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'paid_amount'
    ) then
      alter table public.document_tasks
        add column paid_amount numeric(12, 2) not null default 0;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'payment_status'
    ) then
      alter table public.document_tasks
        add column payment_status text not null default 'unpaid';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'document_count'
    ) then
      alter table public.document_tasks
        add column document_count integer not null default 0;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'required_documents'
    ) then
      alter table public.document_tasks
        add column required_documents jsonb not null default '[]'::jsonb;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'received_documents'
    ) then
      alter table public.document_tasks
        add column received_documents jsonb not null default '[]'::jsonb;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'result_notes'
    ) then
      alter table public.document_tasks add column result_notes text null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'archived_at'
    ) then
      alter table public.document_tasks add column archived_at timestamptz null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'updated_at'
    ) then
      alter table public.document_tasks
        add column updated_at timestamptz not null default now();
    end if;
  end if;
end $$;

-- Foreign keys
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'client_id'
  ) and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clients'
  ) and not exists (
    select 1 from pg_constraint where conname = 'document_tasks_client_id_fkey'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'car_id'
  ) and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cars'
  ) and not exists (
    select 1 from pg_constraint where conname = 'document_tasks_car_id_fkey'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_car_id_fkey
      foreign key (car_id) references public.cars(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'assigned_to'
  ) and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) and not exists (
    select 1 from pg_constraint where conname = 'document_tasks_assigned_to_fkey'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_assigned_to_fkey
      foreign key (assigned_to) references public.profiles(id) on delete set null;
  end if;
end $$;

-- Check constraints
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'priority'
  ) and not exists (
    select 1 from pg_constraint where conname = 'document_tasks_priority_check'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_priority_check
      check (priority in ('low', 'normal', 'high', 'urgent'));
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'payment_status'
  ) and not exists (
    select 1 from pg_constraint where conname = 'document_tasks_payment_status_check'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_payment_status_check
      check (payment_status in ('unpaid', 'partially_paid', 'paid'));
  end if;
end $$;

-- updated_at trigger
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'document_tasks'
      and column_name = 'updated_at'
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'document_tasks_updated_at'
      and tgrelid = 'public.document_tasks'::regclass
  ) then
    create trigger document_tasks_updated_at
    before update on public.document_tasks
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;
