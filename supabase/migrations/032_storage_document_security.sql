-- RemAuto CRM: tighten Supabase Storage access for document buckets
-- Apply manually in Supabase SQL Editor after 031.
-- Idempotent. Does not weaken table RLS.
--
-- Root cause:
-- storage.objects policies from 015 grant any authenticated user full bucket access.
-- Table RLS (026/031) does not protect the Storage API.
--
-- Object naming (unchanged):
--   document-templates: templates/{template_uuid}/{timestamp}-{filename}
--   generated-documents: generated/{year}/{month}/{client_id}/{generated_uuid}/{filename}.docx

-- ---------------------------------------------------------------------------
-- 1. Path helpers
-- ---------------------------------------------------------------------------

create or replace function public.storage_template_id_from_path(object_path text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when split_part(object_path, '/', 1) = 'templates'
      and split_part(object_path, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_path, '/', 2)::uuid
    else null
  end;
$$;

comment on function public.storage_template_id_from_path(text) is
  'Extract document_templates.id UUID from storage path templates/{uuid}/...';

create or replace function public.storage_generated_id_from_path(object_path text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when split_part(object_path, '/', 1) = 'generated'
      and split_part(object_path, '/', 5) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_path, '/', 5)::uuid
    else null
  end;
$$;

comment on function public.storage_generated_id_from_path(text) is
  'Extract generated_documents.id UUID from storage path generated/{y}/{m}/{client}/{uuid}/...';

-- ---------------------------------------------------------------------------
-- 2. Authorization helpers (mirror table RLS from 026/031)
-- ---------------------------------------------------------------------------

create or replace function public.can_read_template_storage_object(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_read_documents_module()
    and public.storage_template_id_from_path(object_path) is not null;
$$;

comment on function public.can_read_template_storage_object(text) is
  'Template file read/list: documents-module roles; path must include template UUID.';

create or replace function public.can_manage_template_storage_object(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_or_owner()
    and public.storage_template_id_from_path(object_path) is not null;
$$;

comment on function public.can_manage_template_storage_object(text) is
  'Template file write: owner/admin only; matches document_templates insert/update RLS.';

create or replace function public.can_read_generated_storage_object(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_read_documents_module() then false
    when public.is_admin_or_owner() then
      public.storage_generated_id_from_path(object_path) is not null
    else coalesce((
      select case
        when gd.document_task_id is null then true
        else public.can_read_document_task(gd.document_task_id)
      end
      from public.generated_documents gd
      where gd.id = public.storage_generated_id_from_path(object_path)
    ), false)
  end;
$$;

comment on function public.can_read_generated_storage_object(text) is
  'Generated file read/list: owner/admin all; others require generated_documents row + task access.';

create or replace function public.can_insert_generated_storage_object(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_documents_module()
    and public.storage_generated_id_from_path(object_path) is not null;
$$;

comment on function public.can_insert_generated_storage_object(text) is
  'Generated file upload: documents-module manage roles; row insert enforces task scope.';

create or replace function public.can_modify_generated_storage_object(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_manage_documents_module() then false
    when public.is_admin_or_owner() then
      public.storage_generated_id_from_path(object_path) is not null
    when public.storage_generated_id_from_path(object_path) is null then false
    else coalesce((
      select case
        when gd.document_task_id is null then true
        else public.can_modify_document_task(gd.document_task_id)
      end
      from public.generated_documents gd
      where gd.id = public.storage_generated_id_from_path(object_path)
    ), public.can_manage_documents_module())
  end;
$$;

comment on function public.can_modify_generated_storage_object(text) is
  'Generated file update: owner/admin all; others require parent task modify access.';

-- ---------------------------------------------------------------------------
-- 3. Replace broad storage.objects policies from 015
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read document template files" on storage.objects;
drop policy if exists "Authenticated users can manage document template files" on storage.objects;
drop policy if exists "Authenticated users can read generated document files" on storage.objects;
drop policy if exists "Authenticated users can manage generated document files" on storage.objects;

drop policy if exists "RBAC select document template storage" on storage.objects;
drop policy if exists "RBAC insert document template storage" on storage.objects;
drop policy if exists "RBAC update document template storage" on storage.objects;
drop policy if exists "RBAC delete document template storage" on storage.objects;
drop policy if exists "RBAC select generated document storage" on storage.objects;
drop policy if exists "RBAC insert generated document storage" on storage.objects;
drop policy if exists "RBAC update generated document storage" on storage.objects;
drop policy if exists "RBAC delete generated document storage" on storage.objects;

create policy "RBAC select document template storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'document-templates'
    and public.can_read_template_storage_object(name)
  );

create policy "RBAC insert document template storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'document-templates'
    and public.can_manage_template_storage_object(name)
  );

create policy "RBAC update document template storage"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'document-templates'
    and public.can_manage_template_storage_object(name)
  )
  with check (
    bucket_id = 'document-templates'
    and public.can_manage_template_storage_object(name)
  );

create policy "RBAC delete document template storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'document-templates'
    and public.is_owner()
    and public.storage_template_id_from_path(name) is not null
  );

create policy "RBAC select generated document storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'generated-documents'
    and public.can_read_generated_storage_object(name)
  );

create policy "RBAC insert generated document storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'generated-documents'
    and public.can_insert_generated_storage_object(name)
  );

create policy "RBAC update generated document storage"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'generated-documents'
    and public.can_modify_generated_storage_object(name)
  )
  with check (
    bucket_id = 'generated-documents'
    and public.can_modify_generated_storage_object(name)
  );

create policy "RBAC delete generated document storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'generated-documents'
    and public.is_owner()
    and public.storage_generated_id_from_path(name) is not null
  );
