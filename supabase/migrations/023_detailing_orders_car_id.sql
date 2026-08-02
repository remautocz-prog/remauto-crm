-- RemAuto CRM: optional link from detailing orders to CRM vehicles
-- Migration 023 — additive only. Do not apply automatically.

alter table public.detailing_orders
  add column if not exists car_id bigint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'detailing_orders_car_id_fkey'
  ) then
    alter table public.detailing_orders
      add constraint detailing_orders_car_id_fkey
      foreign key (car_id)
      references public.cars (id)
      on delete set null;
  end if;
end $$;

create index if not exists detailing_orders_car_id_idx
  on public.detailing_orders (car_id)
  where car_id is not null;
