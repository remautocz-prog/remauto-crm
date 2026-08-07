-- RemAuto CRM: track who archived a document task (additive, idempotent)
-- Apply manually when ready. archived_at already exists from migration 006.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_tasks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'document_tasks'
      and column_name = 'archived_by'
  ) then
    alter table public.document_tasks
      add column archived_by uuid null references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists document_tasks_archived_at_idx
  on public.document_tasks (archived_at)
  where archived_at is not null;

create index if not exists document_tasks_archived_by_idx
  on public.document_tasks (archived_by)
  where archived_by is not null;
