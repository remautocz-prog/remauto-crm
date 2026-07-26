-- RemAuto CRM: allow null purchase_price for commission and client_order vehicles
-- Idempotent: only drops NOT NULL when the column is currently required.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cars'
      and column_name = 'purchase_price'
      and is_nullable = 'NO'
  ) then
    alter table public.cars
      alter column purchase_price drop not null;
  end if;
end $$;
