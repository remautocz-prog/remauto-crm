-- =============================================================================
-- RemAuto CRM — Profiles owner-role guard verification (READ-ONLY)
-- Run in Supabase SQL Editor AFTER manually applying migration 033.
-- SELECT statements only — no DDL/DML.
-- =============================================================================

SELECT
  'TRIGGER FUNCTION' AS section,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'protect_profile_self_elevation';

SELECT
  'TRIGGER' AS section,
  tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'profiles'
  AND tgname = 'profiles_protect_self_elevation'
  AND NOT t.tgisinternal;

SELECT
  'PROFILES UPDATE POLICY' AS section,
  policyname,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'UPDATE';

SELECT
  'FINAL CHECK' AS section,
  check_name,
  status,
  details
FROM (
  SELECT
    'trigger_present' AS check_name,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'profiles'
          AND t.tgname = 'profiles_protect_self_elevation'
          AND NOT t.tgisinternal
      ) THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'profiles_protect_self_elevation on public.profiles' AS details

  UNION ALL

  SELECT
    'owner_assign_guard_in_function' AS check_name,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%Only the owner can assign the owner role%'
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'protect_profile_self_elevation contains owner-assign guard' AS details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'protect_profile_self_elevation'

  UNION ALL

  SELECT
    'inactive_actor_guard_in_function' AS check_name,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%Inactive users cannot modify profiles%'
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'protect_profile_self_elevation blocks inactive actors' AS details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'protect_profile_self_elevation'

  UNION ALL

  SELECT
    'service_role_bypass_preserved' AS check_name,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%auth.uid() is null%'
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'auth.uid() IS NULL early return preserved for invite upsert' AS details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'protect_profile_self_elevation'
) checks
ORDER BY check_name;
