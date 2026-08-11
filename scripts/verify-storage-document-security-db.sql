-- =============================================================================
-- RemAuto CRM — Storage document security verification (READ-ONLY)
-- Run in Supabase SQL Editor AFTER manually applying migration 032.
-- SELECT statements only — no DDL/DML.
-- =============================================================================

SELECT
  'BUCKETS' AS section,
  id,
  name,
  public AS is_public
FROM storage.buckets
WHERE id IN ('document-templates', 'generated-documents')
ORDER BY id;

SELECT
  'HELPERS: path parsers' AS section,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'storage_template_id_from_path',
    'storage_generated_id_from_path',
    'can_read_template_storage_object',
    'can_manage_template_storage_object',
    'can_read_generated_storage_object',
    'can_insert_generated_storage_object',
    'can_modify_generated_storage_object'
  )
ORDER BY p.proname;

SELECT
  'LEGACY POLICIES REMOVED' AS section,
  policyname,
  'STILL PRESENT — re-apply 032' AS status
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN (
    'Authenticated users can read document template files',
    'Authenticated users can manage document template files',
    'Authenticated users can read generated document files',
    'Authenticated users can manage generated document files'
  );

SELECT
  'STORAGE POLICIES' AS section,
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'RBAC % document%storage'
ORDER BY policyname, cmd;

SELECT
  'FINAL CHECK' AS section,
  check_name,
  status,
  details
FROM (
  SELECT
    'buckets_private' AS check_name,
    CASE
      WHEN count(*) = 2
       AND bool_and(public = false)
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    coalesce(string_agg(id || ': public=' || public::text, ', '), 'missing buckets') AS details
  FROM storage.buckets
  WHERE id IN ('document-templates', 'generated-documents')

  UNION ALL

  SELECT
    'legacy_policies_dropped' AS check_name,
    CASE
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    coalesce(string_agg(policyname, ', '), 'none') AS details
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'Authenticated users can%document%'

  UNION ALL

  SELECT
    'rbac_storage_policies_present' AS check_name,
    CASE
      WHEN count(*) >= 8 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    count(*)::text || ' RBAC storage policies' AS details
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'RBAC % document%storage'

  UNION ALL

  SELECT
    'storage_helpers_present' AS check_name,
    CASE
      WHEN count(*) = 7 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    count(*)::text || ' helper functions' AS details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'storage_template_id_from_path',
      'storage_generated_id_from_path',
      'can_read_template_storage_object',
      'can_manage_template_storage_object',
      'can_read_generated_storage_object',
      'can_insert_generated_storage_object',
      'can_modify_generated_storage_object'
    )
) checks
ORDER BY check_name;
