-- Per-service employee assignment and commission snapshots on order line items.

alter table public.detailing_order_services
  add column if not exists assigned_employee_id uuid references public.profiles(id) on delete set null,
  add column if not exists employee_name_snapshot text,
  add column if not exists commission_percent_snapshot numeric(5, 2),
  add column if not exists commission_amount numeric(12, 2) not null default 0;

alter table public.detailing_order_services
  drop constraint if exists detailing_order_services_commission_percent_snapshot_check;

alter table public.detailing_order_services
  add constraint detailing_order_services_commission_percent_snapshot_check
    check (
      commission_percent_snapshot is null
      or (commission_percent_snapshot >= 0 and commission_percent_snapshot <= 100)
    );

alter table public.detailing_order_services
  drop constraint if exists detailing_order_services_commission_amount_check;

alter table public.detailing_order_services
  add constraint detailing_order_services_commission_amount_check
    check (commission_amount >= 0);

create index if not exists detailing_order_services_assigned_employee_idx
  on public.detailing_order_services (assigned_employee_id);

notify pgrst, 'reload schema';
