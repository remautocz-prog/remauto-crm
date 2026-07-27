-- RemAuto CRM: external vehicle fields on document_tasks (car_id remains optional)

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
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'vehicle_mode'
  ) then
    alter table public.document_tasks
      add column vehicle_mode text not null default 'external';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'vehicle_vin'
  ) then
    alter table public.document_tasks add column vehicle_vin text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'vehicle_plate'
  ) then
    alter table public.document_tasks add column vehicle_plate text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'vehicle_brand'
  ) then
    alter table public.document_tasks add column vehicle_brand text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'vehicle_model'
  ) then
    alter table public.document_tasks add column vehicle_model text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_tasks' and column_name = 'vehicle_year'
  ) then
    alter table public.document_tasks add column vehicle_year integer null;
  end if;

  update public.document_tasks
  set vehicle_mode = 'crm'
  where car_id is not null
    and vehicle_mode = 'external';

  if not exists (
    select 1 from pg_constraint where conname = 'document_tasks_vehicle_mode_check'
  ) then
    alter table public.document_tasks
      add constraint document_tasks_vehicle_mode_check
      check (vehicle_mode in ('crm', 'external'));
  end if;
end $$;
