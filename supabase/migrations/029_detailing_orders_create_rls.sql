-- RemAuto CRM: allow detailing employees to create orders (RLS fix)
-- Apply manually. Do not disable RLS.
--
-- Root cause: INSERT used can_manage_detailing(), but SELECT/RETURNING and
-- detailing_order_services INSERT require can_access_detailing_order(), which
-- only matched assigned employees — not the creator of a new unassigned order.
--
-- Maps to app permission detailing.create (owner, admin, detailing).
--
-- Architectural notes (pre-apply review):
-- - created_by is the only ownership column on detailing_orders (expenses
--   already use created_by; no creator_id / author_id duplicate).
-- - can_read_detailing_order: SELECT + child INSERT bootstrap (includes creator).
-- - can_modify_detailing_order: UPDATE (assignment only; creator bootstrap
--   while order has zero service lines).
-- - created_by is immutable after insert (trigger); owner/admin exempt.
-- - Archived orders hidden from detailing employees at RLS read layer.

-- ---------------------------------------------------------------------------
-- 1. Track who created an order (for access during create + RETURNING)
-- ---------------------------------------------------------------------------

alter table public.detailing_orders
  add column if not exists created_by uuid null references public.profiles(id) on delete set null;

create index if not exists detailing_orders_created_by_idx
  on public.detailing_orders (created_by)
  where created_by is not null;

-- ---------------------------------------------------------------------------
-- 2. Immutable created_by (owner/admin may correct; detailing cannot reassign)
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
-- 3. Permission helpers (mirror lib/auth/permissions.ts detailing.create)
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
  'App permission: detailing.create — owner, admin, detailing (active profiles only via current_user_role).';

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
-- 4. Read vs modify access (creator is read/bootstrap only, not ongoing edit)
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
      select 1
      from public.detailing_orders o
      where o.id = order_id
    )
    when public.can_manage_detailing() then exists (
      select 1
      from public.detailing_orders o
      where o.id = order_id
        and o.archived_at is null
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

comment on function public.can_read_detailing_order(uuid) is
  'SELECT / INSERT bootstrap: owner, admin, accountant (read-all), detailing creator or assignee. Archived hidden from detailing.';

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

comment on function public.can_modify_detailing_order(uuid) is
  'UPDATE: owner/admin always; detailing only when assigned, or creator while order has no service lines yet.';

-- Backward-compatible alias used by existing policies / code references.
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
-- 5. Policies
-- ---------------------------------------------------------------------------

drop policy if exists "RBAC select detailing_orders" on public.detailing_orders;
create policy "RBAC select detailing_orders"
  on public.detailing_orders for select to authenticated
  using (public.can_read_detailing_order(id));

drop policy if exists "RBAC insert detailing_orders" on public.detailing_orders;
create policy "RBAC insert detailing_orders"
  on public.detailing_orders for insert to authenticated
  with check (public.can_create_detailing_orders());

drop policy if exists "RBAC update detailing_orders" on public.detailing_orders;
create policy "RBAC update detailing_orders"
  on public.detailing_orders for update to authenticated
  using (public.can_modify_detailing_order(id))
  with check (public.can_modify_detailing_order(id));

-- DELETE unchanged: owner only (026 policy retained; not recreated here).

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

-- DELETE detailing_order_services: owner only (026 policy retained).

-- ---------------------------------------------------------------------------
-- 6. Optional backfill (safe, non-destructive — run manually if desired)
-- ---------------------------------------------------------------------------
-- Legacy rows with NULL created_by keep assignment-based access only.
-- To infer creator from earliest service assignee when unambiguous:
--
-- update public.detailing_orders o
-- set created_by = s.assigned_employee_id
-- from (
--   select order_id, min(assigned_employee_id::text)::uuid as assigned_employee_id
--   from public.detailing_order_services
--   where assigned_employee_id is not null
--   group by order_id
--   having count(distinct assigned_employee_id) = 1
-- ) s
-- where o.id = s.order_id
--   and o.created_by is null
--   and o.assigned_employee_id is null;
