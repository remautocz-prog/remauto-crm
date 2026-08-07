-- RemAuto CRM: fix detailing order INSERT for detailing employees (42501)
-- Apply manually after 026 (and 029 if present). Do not disable RLS.
--
-- Root cause (confirmed):
-- 1. createDetailingOrderAction uses INSERT ... RETURNING (.select("id")).
--    PostgreSQL applies SELECT RLS to returned rows.
-- 2. With 026-only policies, can_access_detailing_order() requires assignment;
--    a brand-new order has no assignment / no created_by → RETURNING fails → 42501
--    on detailing_orders even when INSERT WITH CHECK passed.
-- 3. detailing_order_services INSERT then also fails without creator read path.
--
-- Fixes:
-- - created_by column + creator read path (idempotent if 029 applied)
-- - can_create_detailing_orders() mirrors app permission detailing.create
-- - INSERT WITH CHECK binds created_by = auth.uid() for non-admin creators
-- - Read: detailing creator/assignee can open own archived orders (history/deep links)
-- - Modify: archived orders stay read-only for detailing (archived_at filter on modify)
-- - Active lists continue filtering archived_at in queries/UI (not RLS)
-- - App should insert without RETURNING (see lib/actions/detailing.ts)

-- ---------------------------------------------------------------------------
-- 1. Schema (idempotent)
-- ---------------------------------------------------------------------------

alter table public.detailing_orders
  add column if not exists created_by uuid null references public.profiles(id) on delete set null;

create index if not exists detailing_orders_created_by_idx
  on public.detailing_orders (created_by)
  where created_by is not null;

-- ---------------------------------------------------------------------------
-- 2. Immutable created_by
-- ---------------------------------------------------------------------------

create or replace function public.protect_detailing_order_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    if not public.is_admin_or_owner() then
      raise exception 'detailing_orders.created_by is immutable'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists detailing_orders_protect_created_by on public.detailing_orders;
create trigger detailing_orders_protect_created_by
  before update on public.detailing_orders
  for each row execute function public.protect_detailing_order_created_by();

-- ---------------------------------------------------------------------------
-- 3. Permission helpers — detailing.create (NOT detailing.orders.create)
-- ---------------------------------------------------------------------------

create or replace function public.can_create_detailing_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'detailing']);
$$;

comment on function public.can_create_detailing_orders() is
  'Mirrors app permission detailing.create (owner, admin, detailing; active via current_user_role).';

create or replace function public.can_manage_detailing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_create_detailing_orders();
$$;

-- ---------------------------------------------------------------------------
-- 4. Read / modify access
-- ---------------------------------------------------------------------------

create or replace function public.can_read_detailing_order(order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_read_detailing() then false
    when public.is_admin_or_owner() then true
    when public.current_user_role() = 'accountant' then exists (
      select 1 from public.detailing_orders o where o.id = order_id
    )
    when public.can_create_detailing_orders() then exists (
      select 1
      from public.detailing_orders o
      where o.id = order_id
        and (
          o.created_by = auth.uid()
          or o.assigned_employee_id = auth.uid()
          or exists (
            select 1
            from public.detailing_order_services s
            where s.order_id = o.id
              and s.assigned_employee_id = auth.uid()
          )
        )
    )
    else false
  end;
$$;

create or replace function public.can_modify_detailing_order(order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_manage_detailing() then false
    when public.is_admin_or_owner() then true
    when exists (
      select 1
      from public.detailing_orders o
      where o.id = order_id
        and o.archived_at is null
        and (
          o.assigned_employee_id = auth.uid()
          or exists (
            select 1
            from public.detailing_order_services s
            where s.order_id = o.id
              and s.assigned_employee_id = auth.uid()
          )
          or (
            o.created_by = auth.uid()
            and not exists (
              select 1
              from public.detailing_order_services s
              where s.order_id = o.id
            )
          )
        )
    ) then true
    else false
  end;
$$;

create or replace function public.can_access_detailing_order(order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_read_detailing_order(order_id);
$$;

-- ---------------------------------------------------------------------------
-- 5. Policies — detailing_orders
-- ---------------------------------------------------------------------------

drop policy if exists "RBAC select detailing_orders" on public.detailing_orders;
create policy "RBAC select detailing_orders"
  on public.detailing_orders for select to authenticated
  using (public.can_read_detailing_order(id));

drop policy if exists "RBAC insert detailing_orders" on public.detailing_orders;
create policy "RBAC insert detailing_orders"
  on public.detailing_orders for insert to authenticated
  with check (
    public.can_create_detailing_orders()
    and (
      public.is_admin_or_owner()
      or created_by is not distinct from auth.uid()
    )
  );

drop policy if exists "RBAC update detailing_orders" on public.detailing_orders;
create policy "RBAC update detailing_orders"
  on public.detailing_orders for update to authenticated
  using (public.can_modify_detailing_order(id))
  with check (public.can_modify_detailing_order(id));

-- DELETE: owner only (preserve 026 if present; recreate idempotently)
drop policy if exists "RBAC delete detailing_orders" on public.detailing_orders;
create policy "RBAC delete detailing_orders"
  on public.detailing_orders for delete to authenticated
  using (public.is_owner());

-- ---------------------------------------------------------------------------
-- 6. Policies — detailing_order_services
-- ---------------------------------------------------------------------------

drop policy if exists "RBAC select detailing_order_services" on public.detailing_order_services;
create policy "RBAC select detailing_order_services"
  on public.detailing_order_services for select to authenticated
  using (public.can_read_detailing_order(order_id));

drop policy if exists "RBAC insert detailing_order_services" on public.detailing_order_services;
create policy "RBAC insert detailing_order_services"
  on public.detailing_order_services for insert to authenticated
  with check (
    public.can_create_detailing_orders()
    and public.can_read_detailing_order(order_id)
  );

drop policy if exists "RBAC update detailing_order_services" on public.detailing_order_services;
create policy "RBAC update detailing_order_services"
  on public.detailing_order_services for update to authenticated
  using (public.can_modify_detailing_order(order_id))
  with check (public.can_modify_detailing_order(order_id));

drop policy if exists "RBAC delete detailing_order_services" on public.detailing_order_services;
create policy "RBAC delete detailing_order_services"
  on public.detailing_order_services for delete to authenticated
  using (public.is_owner());

-- ---------------------------------------------------------------------------
-- 7. Post-apply verification (run manually in SQL editor as each role)
-- ---------------------------------------------------------------------------
-- select auth.uid(), public.current_user_role(), public.can_create_detailing_orders();
--
-- Expected:
--   owner/admin/detailing (active) -> can_create true
--   documents/accountant/inactive -> can_create false
--
-- List policies:
-- select tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('detailing_orders', 'detailing_order_services')
-- order by tablename, cmd, policyname;
