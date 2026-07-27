-- RemAuto CRM: optional payment metadata on document_tasks (additive)

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
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'paid_at'
  ) then
    alter table public.document_tasks add column paid_at timestamptz null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'payment_method'
  ) then
    alter table public.document_tasks add column payment_method text null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'document_tasks_payment_method_check'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_payment_method_check
      check (
        payment_method is null
        or payment_method in ('cash', 'bank_transfer', 'card', 'other')
      );
  end if;

  update public.document_tasks
  set paid_at = coalesce(paid_at, updated_at, created_at)
  where payment_status = 'paid'
    and paid_at is null;
end $$;
