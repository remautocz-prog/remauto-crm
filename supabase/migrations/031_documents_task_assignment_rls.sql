-- RemAuto CRM: restrict documents-role employees to assigned document tasks only
-- Apply manually in Supabase SQL Editor after 026 (and 028 if present).
-- Idempotent. No data updates. Does not disable RLS.
--
-- Root cause:
-- document_tasks SELECT used broad can_read_documents_module(), so role=documents
-- could read any colleague's task (e.g. /documents/[id] URL tampering).
--
-- Fix:
-- - can_read_document_task(task_id) / can_modify_document_task(task_id)
-- - documents role: assigned_to = auth.uid() required for read/modify
-- - owner/admin: full access; lawyer/accountant: unchanged module-wide read

-- ---------------------------------------------------------------------------
-- 1. Row-aware helpers (SECURITY DEFINER, fixed search_path — matches 026)
-- ---------------------------------------------------------------------------

create or replace function public.can_read_document_task(task_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_read_documents_module() then false
    when public.is_admin_or_owner() then true
    when public.current_user_role() in ('lawyer', 'accountant') then true
    when public.current_user_role() = 'documents' then exists (
      select 1
      from public.document_tasks t
      where t.id = task_id
        and t.assigned_to is not distinct from auth.uid()
    )
    else false
  end;
$$;

comment on function public.can_read_document_task(bigint) is
  'Row-level document task read: documents employees only when assigned_to = auth.uid(); owner/admin all; lawyer/accountant module-wide.';

create or replace function public.can_modify_document_task(task_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_manage_documents_module() then false
    when public.is_admin_or_owner() then true
    when public.current_user_role() = 'lawyer' then true
    when public.current_user_role() = 'documents' then exists (
      select 1
      from public.document_tasks t
      where t.id = task_id
        and t.assigned_to is not distinct from auth.uid()
    )
    else false
  end;
$$;

comment on function public.can_modify_document_task(bigint) is
  'Row-level document task write: documents employees only when assigned_to = auth.uid(); owner/admin/lawyer module-wide manage.';

-- ---------------------------------------------------------------------------
-- 2. document_tasks policies
-- ---------------------------------------------------------------------------

drop policy if exists "RBAC select document_tasks" on public.document_tasks;
drop policy if exists "RBAC insert document_tasks" on public.document_tasks;
drop policy if exists "RBAC update document_tasks" on public.document_tasks;

create policy "RBAC select document_tasks"
  on public.document_tasks for select to authenticated
  using (
    case
      when not public.can_read_documents_module() then false
      when public.current_user_role() = 'documents' then assigned_to is not distinct from auth.uid()
      else true
    end
  );

create policy "RBAC insert document_tasks"
  on public.document_tasks for insert to authenticated
  with check (
    case
      when public.current_user_role() = 'documents' then
        assigned_to is not distinct from auth.uid()
      else public.can_manage_documents_module()
    end
  );

create policy "RBAC update document_tasks"
  on public.document_tasks for update to authenticated
  using (public.can_modify_document_task(id))
  with check (public.can_modify_document_task(id));

-- DELETE policy unchanged (owner-only via is_owner)

-- ---------------------------------------------------------------------------
-- 3. document_task_services — parent task access required
-- ---------------------------------------------------------------------------

drop policy if exists "RBAC select document_task_services" on public.document_task_services;
drop policy if exists "RBAC insert document_task_services" on public.document_task_services;
drop policy if exists "RBAC update document_task_services" on public.document_task_services;

create policy "RBAC select document_task_services"
  on public.document_task_services for select to authenticated
  using (public.can_read_document_task(document_task_id));

create policy "RBAC insert document_task_services"
  on public.document_task_services for insert to authenticated
  with check (public.can_modify_document_task(document_task_id));

create policy "RBAC update document_task_services"
  on public.document_task_services for update to authenticated
  using (public.can_modify_document_task(document_task_id))
  with check (public.can_modify_document_task(document_task_id));

-- DELETE policy unchanged (owner-only)

-- ---------------------------------------------------------------------------
-- 4. generated_documents — prevent child-row bypass on /documents/[id]
-- ---------------------------------------------------------------------------

drop policy if exists "RBAC select generated_documents" on public.generated_documents;
drop policy if exists "RBAC insert generated_documents" on public.generated_documents;
drop policy if exists "RBAC update generated_documents" on public.generated_documents;

create policy "RBAC select generated_documents"
  on public.generated_documents for select to authenticated
  using (
    public.can_read_documents_module()
    and (
      document_task_id is null
      or public.can_read_document_task(document_task_id)
    )
  );

create policy "RBAC insert generated_documents"
  on public.generated_documents for insert to authenticated
  with check (
    case
      when document_task_id is not null then
        public.can_modify_document_task(document_task_id)
      else public.can_manage_documents_module()
    end
  );

create policy "RBAC update generated_documents"
  on public.generated_documents for update to authenticated
  using (
    case
      when document_task_id is not null then
        public.can_modify_document_task(document_task_id)
      else public.can_manage_documents_module()
    end
  )
  with check (
    case
      when document_task_id is not null then
        public.can_modify_document_task(document_task_id)
      else public.can_manage_documents_module()
    end
  );

-- DELETE policy unchanged (owner-only)
