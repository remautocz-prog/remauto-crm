-- RemAuto CRM: indexes for document task assignment and deadline filters (idempotent)
-- Columns assigned_to, due_date, status, priority already exist from migration 006.

create index if not exists document_tasks_assigned_to_idx
  on public.document_tasks (assigned_to);

create index if not exists document_tasks_due_date_idx
  on public.document_tasks (due_date);

create index if not exists document_tasks_status_idx
  on public.document_tasks (status);

create index if not exists document_tasks_priority_idx
  on public.document_tasks (priority);
