-- Inspect existing RemAuto CRM schema objects in Supabase SQL Editor.
-- Run this first to see what is already present.

select
  'table' as object_type,
  tablename as object_name,
  'public.' || tablename as qualified_name
from pg_tables
where schemaname = 'public'
  and tablename in (
    'cars',
    'clients',
    'documents',
    'detailing_orders',
    'finance_transactions',
    'notifications'
  )

union all

select
  'view' as object_type,
  viewname as object_name,
  'public.' || viewname as qualified_name
from pg_views
where schemaname = 'public'
  and viewname = 'monthly_profit'

union all

select
  'function' as object_type,
  p.proname as object_name,
  'public.' || p.proname as qualified_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'set_updated_at'

order by object_type, object_name;

-- Expected CRM tables:
-- cars, clients, documents, detailing_orders, finance_transactions, notifications
