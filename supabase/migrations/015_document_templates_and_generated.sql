-- RemAuto CRM: document templates, generated documents, company settings, storage buckets

-- Company settings (singleton for template placeholders)
create table if not exists public.company_settings (
  id smallint primary key default 1 check (id = 1),
  name text null,
  ico text null,
  dic text null,
  address text null,
  city text null,
  postal_code text null,
  country text null default 'CZ',
  phone text null,
  email text null,
  bank_account text null,
  updated_at timestamptz not null default now()
);

insert into public.company_settings (id)
values (1)
on conflict (id) do nothing;

-- Document templates
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  language text not null,
  storage_path text not null,
  original_filename text not null,
  description text null,
  recognized_placeholders jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_templates_category_check check (
    category in (
      'purchase_agreement',
      'handover_protocol',
      'power_of_attorney',
      'commission_agreement',
      'invoice_sheet',
      'custom'
    )
  ),
  constraint document_templates_language_check check (
    language in ('ru', 'cs', 'en')
  )
);

create index if not exists document_templates_category_idx
  on public.document_templates (category);

create index if not exists document_templates_is_active_idx
  on public.document_templates (is_active);

create index if not exists document_templates_language_idx
  on public.document_templates (language);

-- Generated documents
create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  template_id uuid null references public.document_templates(id) on delete set null,
  client_id bigint null references public.clients(id) on delete set null,
  vehicle_id bigint null references public.cars(id) on delete set null,
  document_task_id bigint null references public.document_tasks(id) on delete set null,
  generated_by uuid null references public.profiles(id) on delete set null,
  language text not null,
  document_name text not null,
  docx_storage_path text null,
  pdf_storage_path text null,
  snapshot_data jsonb not null default '{}'::jsonb,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint generated_documents_language_check check (
    language in ('ru', 'cs', 'en')
  )
);

create index if not exists generated_documents_template_id_idx
  on public.generated_documents (template_id);

create index if not exists generated_documents_client_id_idx
  on public.generated_documents (client_id);

create index if not exists generated_documents_vehicle_id_idx
  on public.generated_documents (vehicle_id);

create index if not exists generated_documents_document_task_id_idx
  on public.generated_documents (document_task_id);

create index if not exists generated_documents_created_at_idx
  on public.generated_documents (created_at desc);

-- updated_at triggers
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'document_templates_updated_at'
      and tgrelid = 'public.document_templates'::regclass
  ) then
    create trigger document_templates_updated_at
    before update on public.document_templates
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'company_settings_updated_at'
      and tgrelid = 'public.company_settings'::regclass
  ) then
    create trigger company_settings_updated_at
    before update on public.company_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- RLS
alter table public.company_settings enable row level security;
alter table public.document_templates enable row level security;
alter table public.generated_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'company_settings'
      and policyname = 'Authenticated users can read company settings'
  ) then
    create policy "Authenticated users can read company settings"
      on public.company_settings for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'company_settings'
      and policyname = 'Authenticated users can manage company settings'
  ) then
    create policy "Authenticated users can manage company settings"
      on public.company_settings for all to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_templates'
      and policyname = 'Authenticated users can read document templates'
  ) then
    create policy "Authenticated users can read document templates"
      on public.document_templates for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_templates'
      and policyname = 'Authenticated users can manage document templates'
  ) then
    create policy "Authenticated users can manage document templates"
      on public.document_templates for all to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'generated_documents'
      and policyname = 'Authenticated users can read generated documents'
  ) then
    create policy "Authenticated users can read generated documents"
      on public.generated_documents for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'generated_documents'
      and policyname = 'Authenticated users can manage generated documents'
  ) then
    create policy "Authenticated users can manage generated documents"
      on public.generated_documents for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Storage buckets (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-templates',
  'document-templates',
  false,
  5242880,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-documents',
  'generated-documents',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated users can read document template files'
  ) then
    create policy "Authenticated users can read document template files"
      on storage.objects for select to authenticated
      using (bucket_id = 'document-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated users can manage document template files'
  ) then
    create policy "Authenticated users can manage document template files"
      on storage.objects for all to authenticated
      using (bucket_id = 'document-templates')
      with check (bucket_id = 'document-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated users can read generated document files'
  ) then
    create policy "Authenticated users can read generated document files"
      on storage.objects for select to authenticated
      using (bucket_id = 'generated-documents');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated users can manage generated document files'
  ) then
    create policy "Authenticated users can manage generated document files"
      on storage.objects for all to authenticated
      using (bucket_id = 'generated-documents')
      with check (bucket_id = 'generated-documents');
  end if;
end $$;
