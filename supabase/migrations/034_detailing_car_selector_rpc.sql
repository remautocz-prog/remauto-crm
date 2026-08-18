-- RemAuto CRM: narrow read path for detailing internal-vehicle car selector
-- Does not change existing cars RLS policies. Security definer returns identification fields only.

create or replace function public.list_detailing_car_selector_cars()
returns table (
  id bigint,
  brand text,
  model text,
  year integer,
  vin text,
  registration_number text,
  status text,
  mileage integer,
  stock_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.brand,
    c.model,
    c.year,
    c.vin,
    c.registration_number,
    c.status,
    c.mileage,
    c.stock_number
  from public.cars c
  where (
    public.can_create_detailing_orders()
    or public.can_read_cars()
  )
    and c.status = any(array[
      'in_stock',
      'reserved',
      'in_transit',
      'in_progress',
      'new',
      'sold'
    ]::text[])
  order by
    case c.status
      when 'in_stock' then 0
      when 'reserved' then 1
      when 'in_transit' then 2
      when 'in_progress' then 3
      when 'new' then 4
      when 'sold' then 5
      else 99
    end,
    c.brand,
    c.model,
    c.year desc;
$$;

comment on function public.list_detailing_car_selector_cars() is
  'Returns minimal CRM car identification fields for detailing internal-vehicle selector. Allowed for detailing.create and cars.read roles. No financial fields.';

revoke all on function public.list_detailing_car_selector_cars() from public;
revoke all on function public.list_detailing_car_selector_cars() from anon;
grant execute on function public.list_detailing_car_selector_cars() to authenticated;
