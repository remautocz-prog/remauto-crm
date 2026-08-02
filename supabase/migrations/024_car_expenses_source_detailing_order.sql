-- RemAuto CRM: prevent duplicate vehicle expenses from the same detailing order
-- Migration 024 — additive only. Do not apply automatically.

alter table public.car_expenses
  add column if not exists source_detailing_order_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'car_expenses_source_detailing_order_id_fkey'
  ) then
    alter table public.car_expenses
      add constraint car_expenses_source_detailing_order_id_fkey
      foreign key (source_detailing_order_id)
      references public.detailing_orders (id)
      on delete set null;
  end if;
end $$;

create unique index if not exists car_expenses_source_detailing_order_id_uidx
  on public.car_expenses (source_detailing_order_id)
  where source_detailing_order_id is not null;
