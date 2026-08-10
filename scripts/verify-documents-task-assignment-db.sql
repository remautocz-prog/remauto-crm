-- =============================================================================
-- RemAuto CRM — Documents task assignment RLS verification (READ-ONLY)
-- Run in Supabase SQL Editor AFTER manually applying migration 031.
-- SELECT statements only — no DDL/DML.
-- =============================================================================

SELECT
  'HELPER: can_read_document_task' AS section,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'can_read_document_task';

SELECT
  'HELPER: can_modify_document_task' AS section,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'can_modify_document_task';

SELECT
  'RLS ENABLED' AS section,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('document_tasks', 'document_task_services', 'generated_documents')
ORDER BY c.relname;

SELECT
  'POLICIES: document_tasks' AS section,
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'document_tasks'
ORDER BY cmd, policyname;

SELECT
  'POLICIES: document_task_services' AS section,
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'document_task_services'
ORDER BY cmd, policyname;

SELECT
  'POLICIES: generated_documents' AS section,
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'generated_documents'
  AND cmd IN ('SELECT', 'INSERT', 'UPDATE')
ORDER BY cmd, policyname;

SELECT
  'FINAL CHECK' AS section,
  check_name,
  status,
  details
FROM (
  SELECT
    'helpers_present' AS check_name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'can_read_document_task'
      )
      AND EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'can_modify_document_task'
      )
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'can_read_document_task + can_modify_document_task exist (031)' AS details

  UNION ALL

  SELECT
    'document_tasks_select_scoped',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'document_tasks'
          AND policyname = 'RBAC select document_tasks'
          AND qual ILIKE '%documents%'
          AND qual ILIKE '%assigned_to%'
          AND qual ILIKE '%auth.uid%'
      )
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    'SELECT requires assigned_to = auth.uid() for documents role'

  UNION ALL

  SELECT
    'no_broad_documents_select',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'document_tasks'
          AND policyname = 'RBAC select document_tasks'
          AND qual = 'can_read_documents_module()'
      )
      THEN 'FAIL'
      ELSE 'PASS'
    END,
    'Old broad SELECT (can_read_documents_module() only) must be gone'

  UNION ALL

  SELECT
    'services_parent_guard',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'document_task_services'
          AND policyname = 'RBAC select document_task_services'
          AND qual ILIKE '%can_read_document_task%'
      )
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    'document_task_services SELECT uses parent task helper'

  UNION ALL

  SELECT
    'generated_docs_parent_guard',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'generated_documents'
          AND policyname = 'RBAC select generated_documents'
          AND qual ILIKE '%can_read_document_task%'
      )
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    'generated_documents SELECT scoped by document_task_id when set'
) AS checks
ORDER BY check_name;
