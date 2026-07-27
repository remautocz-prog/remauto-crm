-- RemAuto CRM: status milestone timestamps on document_tasks (additive)

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_tasks'
  ) then
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'ready_at'
  ) then
    alter table public.document_tasks add column ready_at timestamptz null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'delivered_at'
  ) then
    alter table public.document_tasks add column delivered_at timestamptz null;
  end if;

  update public.document_tasks
  set ready_at = coalesce(ready_at, completed_at::timestamptz, updated_at, created_at)
  where status in ('COMPLETED', 'DELIVERED')
    and ready_at is null;

  update public.document_tasks
  set delivered_at = coalesce(delivered_at, completed_at::timestamptz, updated_at, created_at)
  where status = 'DELIVERED'
    and delivered_at is null;
end $$;
