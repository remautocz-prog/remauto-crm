-- RemAuto CRM: client notes + lookup indexes (idempotent)

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id bigint not null references public.clients(id) on delete cascade,
  content text not null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_notes_client_id_idx
  on public.client_notes (client_id);

create index if not exists client_notes_created_at_idx
  on public.client_notes (created_at desc);

create index if not exists clients_phone_idx
  on public.clients (phone);

create index if not exists clients_email_idx
  on public.clients (email);

create index if not exists cars_client_id_idx
  on public.cars (client_id);

create index if not exists document_tasks_client_id_idx
  on public.document_tasks (client_id);

-- updated_at trigger for client_notes
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'client_notes'
  ) and not exists (
    select 1 from pg_trigger
    where tgname = 'client_notes_updated_at'
      and tgrelid = 'public.client_notes'::regclass
  ) then
    create trigger client_notes_updated_at
    before update on public.client_notes
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

-- RLS (matches clients access model)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'client_notes'
  ) then
    alter table public.client_notes enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'client_notes'
        and policyname = 'Authenticated users can read client notes'
    ) then
      create policy "Authenticated users can read client notes"
        on public.client_notes for select to authenticated using (true);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'client_notes'
        and policyname = 'Authenticated users can manage client notes'
    ) then
      create policy "Authenticated users can manage client notes"
        on public.client_notes for all to authenticated using (true) with check (true);
    end if;
  end if;
end $$;
