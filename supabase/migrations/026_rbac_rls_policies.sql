-- RBAC helper functions and role-aware RLS policies
-- Additive, idempotent. Apply manually after 025_profiles_rbac.sql.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when coalesce(p.is_active, false) = false then 'inactive'
    else p.role
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() is not null
    and public.current_user_role() <> 'inactive';
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner';
$$;

create or replace function public.is_admin_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('owner', 'admin');
$$;

create or replace function public.has_app_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = any(required_roles);
$$;

create or replace function public.can_read_cars()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array[
    'owner', 'admin', 'documents', 'accountant', 'lawyer'
  ]);
$$;

create or replace function public.can_manage_cars()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin']);
$$;

create or replace function public.can_read_clients()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array[
    'owner', 'admin', 'documents', 'lawyer'
  ]);
$$;

create or replace function public.can_manage_clients()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin']);
$$;

create or replace function public.can_read_documents_module()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array[
    'owner', 'admin', 'documents', 'accountant', 'lawyer'
  ]);
$$;

create or replace function public.can_manage_documents_module()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array[
    'owner', 'admin', 'documents', 'lawyer'
  ]);
$$;

create or replace function public.can_read_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'accountant']);
$$;

create or replace function public.can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'accountant']);
$$;

create or replace function public.can_read_detailing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array[
    'owner', 'admin', 'detailing', 'accountant'
  ]);
$$;

create or replace function public.can_manage_detailing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'detailing']);
$$;

create or replace function public.can_read_detailing_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'accountant']);
$$;

create or replace function public.can_manage_detailing_expenses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'accountant']);
$$;

create or replace function public.can_access_detailing_order(order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_read_detailing() then false
    when public.is_admin_or_owner() then true
    when public.current_user_role() = 'accountant' then true
    when public.current_user_role() = 'detailing' then exists (
      select 1
      from public.detailing_orders o
      where o.id = order_id
        and (
          o.assigned_employee_id = auth.uid()
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

create or replace function public.can_read_deals()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin', 'lawyer']);
$$;

create or replace function public.can_manage_deals()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(array['owner', 'admin']);
$$;

-- Replace flat authenticated policies with role-aware policies.

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'cars',
        'car_expenses',
        'clients',
        'client_notes',
        'documents',
        'document_tasks',
        'document_task_services',
        'document_templates',
        'generated_documents',
        'company_settings',
        'finance_transactions',
        'deals',
        'deal_handover_details',
        'detailing_services',
        'detailing_orders',
        'detailing_order_services',
        'detailing_employee_settings',
        'detailing_expenses'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  end loop;
end $$;

-- Cars
create policy "RBAC select cars"
  on public.cars for select to authenticated
  using (public.can_read_cars());

create policy "RBAC insert cars"
  on public.cars for insert to authenticated
  with check (public.can_manage_cars());

create policy "RBAC update cars"
  on public.cars for update to authenticated
  using (public.can_manage_cars())
  with check (public.can_manage_cars());

create policy "RBAC delete cars"
  on public.cars for delete to authenticated
  using (public.is_owner());

-- Car expenses
create policy "RBAC select car_expenses"
  on public.car_expenses for select to authenticated
  using (public.can_read_finance() or public.can_read_cars());

create policy "RBAC insert car_expenses"
  on public.car_expenses for insert to authenticated
  with check (public.can_manage_finance() or public.can_manage_cars());

create policy "RBAC update car_expenses"
  on public.car_expenses for update to authenticated
  using (public.can_manage_finance() or public.can_manage_cars())
  with check (public.can_manage_finance() or public.can_manage_cars());

create policy "RBAC delete car_expenses"
  on public.car_expenses for delete to authenticated
  using (public.is_owner());

-- Clients
create policy "RBAC select clients"
  on public.clients for select to authenticated
  using (public.can_read_clients());

create policy "RBAC insert clients"
  on public.clients for insert to authenticated
  with check (public.can_manage_clients());

create policy "RBAC update clients"
  on public.clients for update to authenticated
  using (public.can_manage_clients())
  with check (public.can_manage_clients());

create policy "RBAC delete clients"
  on public.clients for delete to authenticated
  using (public.is_owner());

-- Client notes
create policy "RBAC select client_notes"
  on public.client_notes for select to authenticated
  using (public.can_read_clients());

create policy "RBAC insert client_notes"
  on public.client_notes for insert to authenticated
  with check (public.can_manage_clients());

create policy "RBAC update client_notes"
  on public.client_notes for update to authenticated
  using (public.can_manage_clients())
  with check (public.can_manage_clients());

create policy "RBAC delete client_notes"
  on public.client_notes for delete to authenticated
  using (public.is_owner());

-- Legacy documents table
create policy "RBAC select documents"
  on public.documents for select to authenticated
  using (public.can_read_documents_module());

create policy "RBAC insert documents"
  on public.documents for insert to authenticated
  with check (public.can_manage_documents_module());

create policy "RBAC update documents"
  on public.documents for update to authenticated
  using (public.can_manage_documents_module())
  with check (public.can_manage_documents_module());

create policy "RBAC delete documents"
  on public.documents for delete to authenticated
  using (public.is_owner());

-- Document tasks
create policy "RBAC select document_tasks"
  on public.document_tasks for select to authenticated
  using (public.can_read_documents_module());

create policy "RBAC insert document_tasks"
  on public.document_tasks for insert to authenticated
  with check (public.can_manage_documents_module());

create policy "RBAC update document_tasks"
  on public.document_tasks for update to authenticated
  using (public.can_manage_documents_module())
  with check (public.can_manage_documents_module());

create policy "RBAC delete document_tasks"
  on public.document_tasks for delete to authenticated
  using (public.is_owner());

-- Document task services
create policy "RBAC select document_task_services"
  on public.document_task_services for select to authenticated
  using (public.can_read_documents_module());

create policy "RBAC insert document_task_services"
  on public.document_task_services for insert to authenticated
  with check (public.can_manage_documents_module());

create policy "RBAC update document_task_services"
  on public.document_task_services for update to authenticated
  using (public.can_manage_documents_module())
  with check (public.can_manage_documents_module());

create policy "RBAC delete document_task_services"
  on public.document_task_services for delete to authenticated
  using (public.is_owner());

-- Document templates / generated docs / company settings
create policy "RBAC select document_templates"
  on public.document_templates for select to authenticated
  using (public.can_read_documents_module());

create policy "RBAC insert document_templates"
  on public.document_templates for insert to authenticated
  with check (public.is_admin_or_owner());

create policy "RBAC update document_templates"
  on public.document_templates for update to authenticated
  using (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());

create policy "RBAC delete document_templates"
  on public.document_templates for delete to authenticated
  using (public.is_owner());

create policy "RBAC select generated_documents"
  on public.generated_documents for select to authenticated
  using (public.can_read_documents_module());

create policy "RBAC insert generated_documents"
  on public.generated_documents for insert to authenticated
  with check (public.can_manage_documents_module());

create policy "RBAC update generated_documents"
  on public.generated_documents for update to authenticated
  using (public.can_manage_documents_module())
  with check (public.can_manage_documents_module());

create policy "RBAC delete generated_documents"
  on public.generated_documents for delete to authenticated
  using (public.is_owner());

create policy "RBAC select company_settings"
  on public.company_settings for select to authenticated
  using (public.is_admin_or_owner());

create policy "RBAC insert company_settings"
  on public.company_settings for insert to authenticated
  with check (public.is_admin_or_owner());

create policy "RBAC update company_settings"
  on public.company_settings for update to authenticated
  using (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());

create policy "RBAC delete company_settings"
  on public.company_settings for delete to authenticated
  using (public.is_owner());

-- Finance transactions
create policy "RBAC select finance_transactions"
  on public.finance_transactions for select to authenticated
  using (public.can_read_finance());

create policy "RBAC insert finance_transactions"
  on public.finance_transactions for insert to authenticated
  with check (public.can_manage_finance());

create policy "RBAC update finance_transactions"
  on public.finance_transactions for update to authenticated
  using (public.can_manage_finance())
  with check (public.can_manage_finance());

create policy "RBAC delete finance_transactions"
  on public.finance_transactions for delete to authenticated
  using (public.is_owner());

-- Deals
create policy "RBAC select deals"
  on public.deals for select to authenticated
  using (public.can_read_deals());

create policy "RBAC insert deals"
  on public.deals for insert to authenticated
  with check (public.can_manage_deals());

create policy "RBAC update deals"
  on public.deals for update to authenticated
  using (public.can_manage_deals())
  with check (public.can_manage_deals());

create policy "RBAC delete deals"
  on public.deals for delete to authenticated
  using (public.is_owner());

create policy "RBAC select deal_handover_details"
  on public.deal_handover_details for select to authenticated
  using (public.can_read_deals());

create policy "RBAC insert deal_handover_details"
  on public.deal_handover_details for insert to authenticated
  with check (public.can_manage_deals());

create policy "RBAC update deal_handover_details"
  on public.deal_handover_details for update to authenticated
  using (public.can_manage_deals())
  with check (public.can_manage_deals());

create policy "RBAC delete deal_handover_details"
  on public.deal_handover_details for delete to authenticated
  using (public.is_owner());

-- Detailing catalogue
create policy "RBAC select detailing_services"
  on public.detailing_services for select to authenticated
  using (public.can_read_detailing());

create policy "RBAC insert detailing_services"
  on public.detailing_services for insert to authenticated
  with check (public.is_admin_or_owner());

create policy "RBAC update detailing_services"
  on public.detailing_services for update to authenticated
  using (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());

create policy "RBAC delete detailing_services"
  on public.detailing_services for delete to authenticated
  using (public.is_owner());

-- Detailing orders
create policy "RBAC select detailing_orders"
  on public.detailing_orders for select to authenticated
  using (public.can_access_detailing_order(id));

create policy "RBAC insert detailing_orders"
  on public.detailing_orders for insert to authenticated
  with check (public.can_manage_detailing());

create policy "RBAC update detailing_orders"
  on public.detailing_orders for update to authenticated
  using (public.can_access_detailing_order(id))
  with check (public.can_manage_detailing());

create policy "RBAC delete detailing_orders"
  on public.detailing_orders for delete to authenticated
  using (public.is_owner());

-- Detailing order services
create policy "RBAC select detailing_order_services"
  on public.detailing_order_services for select to authenticated
  using (public.can_access_detailing_order(order_id));

create policy "RBAC insert detailing_order_services"
  on public.detailing_order_services for insert to authenticated
  with check (
    public.can_manage_detailing()
    and public.can_access_detailing_order(order_id)
  );

create policy "RBAC update detailing_order_services"
  on public.detailing_order_services for update to authenticated
  using (public.can_access_detailing_order(order_id))
  with check (
    public.can_manage_detailing()
    and public.can_access_detailing_order(order_id)
  );

create policy "RBAC delete detailing_order_services"
  on public.detailing_order_services for delete to authenticated
  using (public.is_owner());

-- Detailing employee settings
create policy "RBAC select detailing_employee_settings"
  on public.detailing_employee_settings for select to authenticated
  using (
    public.is_admin_or_owner()
    or profile_id = auth.uid()
  );

create policy "RBAC insert detailing_employee_settings"
  on public.detailing_employee_settings for insert to authenticated
  with check (public.is_admin_or_owner());

create policy "RBAC update detailing_employee_settings"
  on public.detailing_employee_settings for update to authenticated
  using (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());

create policy "RBAC delete detailing_employee_settings"
  on public.detailing_employee_settings for delete to authenticated
  using (public.is_owner());

-- Detailing expenses
create policy "RBAC select detailing_expenses"
  on public.detailing_expenses for select to authenticated
  using (public.can_manage_detailing_expenses());

create policy "RBAC insert detailing_expenses"
  on public.detailing_expenses for insert to authenticated
  with check (public.can_manage_detailing_expenses());

create policy "RBAC update detailing_expenses"
  on public.detailing_expenses for update to authenticated
  using (public.can_manage_detailing_expenses())
  with check (public.can_manage_detailing_expenses());

create policy "RBAC delete detailing_expenses"
  on public.detailing_expenses for delete to authenticated
  using (public.is_owner());

revoke delete on table public.cars from authenticated;
revoke delete on table public.car_expenses from authenticated;
revoke delete on table public.clients from authenticated;
revoke delete on table public.client_notes from authenticated;
revoke delete on table public.documents from authenticated;
revoke delete on table public.document_tasks from authenticated;
revoke delete on table public.document_task_services from authenticated;
revoke delete on table public.document_templates from authenticated;
revoke delete on table public.generated_documents from authenticated;
revoke delete on table public.company_settings from authenticated;
revoke delete on table public.finance_transactions from authenticated;
revoke delete on table public.deals from authenticated;
revoke delete on table public.deal_handover_details from authenticated;
revoke delete on table public.detailing_services from authenticated;
revoke delete on table public.detailing_orders from authenticated;
revoke delete on table public.detailing_order_services from authenticated;
revoke delete on table public.detailing_employee_settings from authenticated;
revoke delete on table public.detailing_expenses from authenticated;

grant delete on table public.cars to authenticated;
grant delete on table public.car_expenses to authenticated;
grant delete on table public.clients to authenticated;
grant delete on table public.client_notes to authenticated;
grant delete on table public.documents to authenticated;
grant delete on table public.document_tasks to authenticated;
grant delete on table public.document_task_services to authenticated;
grant delete on table public.document_templates to authenticated;
grant delete on table public.generated_documents to authenticated;
grant delete on table public.company_settings to authenticated;
grant delete on table public.finance_transactions to authenticated;
grant delete on table public.deals to authenticated;
grant delete on table public.deal_handover_details to authenticated;
grant delete on table public.detailing_services to authenticated;
grant delete on table public.detailing_orders to authenticated;
grant delete on table public.detailing_order_services to authenticated;
grant delete on table public.detailing_employee_settings to authenticated;
grant delete on table public.detailing_expenses to authenticated;
