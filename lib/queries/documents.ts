import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import {
  derivePaymentStatus,
  getDocumentFinanceSummary,
  getTaskDueDate,
  getTaskServiceLabel,
  isCompletedButUnpaid,
  isReadyForDelivery,
  isTaskActive,
  isTaskArchived,
  isTaskDueToday,
  isTaskDueWithinDays,
  isTaskOverdue,
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { getClientDisplayName } from "@/lib/clients/validation";
import type {
  DocumentDashboardAlert,
  DocumentDashboardMetrics,
  DocumentTask,
  DocumentTasksListParams,
  DocumentTaskWithRelations,
} from "@/lib/types/documents";

const TASK_SELECT = `
  *,
  clients:client_id ( id, full_name, company, phone, email, client_type ),
  cars:car_id ( id, brand, model, year, vin, registration_number, client_id ),
  assignee:assigned_to ( id, full_name )
`;

function mapRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  const task = mapDocumentTask(row);
  return mergeTaskRelations(task, row);
}

function matchesSearch(task: DocumentTaskWithRelations, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;

  if (String(task.id).includes(term)) return true;

  const clientName = task.client
    ? getClientDisplayName({
        full_name: task.client.full_name,
        company: task.client.company,
        client_type: task.client.client_type ?? "individual",
      }).toLowerCase()
    : "";
  if (clientName.includes(term)) return true;
  if (task.client?.company?.toLowerCase().includes(term)) return true;
  if (task.client?.phone?.toLowerCase().includes(term)) return true;
  if (task.client?.email?.toLowerCase().includes(term)) return true;

  if (task.car?.vin?.toLowerCase().includes(term)) return true;
  if (task.car?.registration_number?.toLowerCase().includes(term)) return true;
  if (`${task.car?.brand ?? ""} ${task.car?.model ?? ""}`.toLowerCase().includes(term)) {
    return true;
  }

  if (task.vehicle_vin?.toLowerCase().includes(term)) return true;
  if (task.vehicle_plate?.toLowerCase().includes(term)) return true;
  if (`${task.vehicle_brand ?? ""} ${task.vehicle_model ?? ""}`.toLowerCase().includes(term)) {
    return true;
  }
  if (task.vehicle_year != null && String(task.vehicle_year).includes(term)) return true;

  const service = getTaskServiceLabel(task).toLowerCase();
  if (service.includes(term)) return true;
  if (task.custom_service_name?.toLowerCase().includes(term)) return true;

  return false;
}

function sortTasks(tasks: DocumentTaskWithRelations[], sort?: string) {
  const copy = [...tasks];
  switch (sort) {
    case "oldest":
      return copy.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "closest_deadline":
      return copy.sort((a, b) => {
        const aDue = getTaskDueDate(a);
        const bDue = getTaskDueDate(b);
        if (!aDue && !bDue) return 0;
        if (!aDue) return 1;
        if (!bDue) return -1;
        return new Date(aDue).getTime() - new Date(bDue).getTime();
      });
    case "overdue_first":
      return copy.sort((a, b) => {
        const aOverdue = isTaskOverdue(a) ? 1 : 0;
        const bOverdue = isTaskOverdue(b) ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        const aDue = getTaskDueDate(a);
        const bDue = getTaskDueDate(b);
        if (!aDue && !bDue) return 0;
        if (!aDue) return 1;
        if (!bDue) return -1;
        return new Date(aDue).getTime() - new Date(bDue).getTime();
      });
    case "highest_price":
      return copy.sort(
        (a, b) => Number(b.service_price ?? 0) - Number(a.service_price ?? 0)
      );
    case "client_name":
      return copy.sort((a, b) => {
        const aName = a.client ? getClientDisplayName(a.client) : "";
        const bName = b.client ? getClientDisplayName(b.client) : "";
        return aName.localeCompare(bName);
      });
    default:
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

export async function getDocumentTasks(
  params: DocumentTasksListParams = {}
): Promise<DocumentTaskWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("document_tasks").select(TASK_SELECT);

  if (params.archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", normalizeDocumentTaskStatus(params.status));
  }

  if (params.priority && params.priority !== "all") {
    query = query.eq("priority", params.priority);
  }

  if (params.service_type && params.service_type !== "all") {
    query = query.or(
      `service_type.eq.${params.service_type},work_type.eq.${params.service_type}`
    );
  }

  if (params.assigned_to && params.assigned_to !== "all") {
    if (params.assigned_to === "unassigned") {
      query = query.is("assigned_to", null);
    } else {
      query = query.eq("assigned_to", params.assigned_to);
    }
  }

  if (params.payment_status && params.payment_status !== "all") {
    query = query.eq("payment_status", params.payment_status);
  }

  const { data, error } = await query;
  if (error) throw error;

  let tasks = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));

  if (params.q?.trim()) {
    tasks = tasks.filter((task) => matchesSearch(task, params.q!));
  }

  if (params.overdue) {
    tasks = tasks.filter((task) => isTaskOverdue(task));
  }

  return sortTasks(tasks, params.sort);
}

export async function getDocumentTaskById(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getDocumentTasksByClientId(clientId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_SELECT)
    .eq("client_id", clientId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getDocumentTasksByCarId(carId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_SELECT)
    .eq("car_id", carId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getDocumentFilterOptions() {
  const supabase = await createClient();
  const [profilesResult, tasksResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("document_tasks").select("assigned_to, service_type, status, payment_status"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const assignees = (profilesResult.data ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name ?? ""),
  }));

  const serviceTypes = Array.from(
    new Set(
      (tasksResult.data ?? [])
        .map((row) => row.service_type)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  return { assignees, serviceTypes };
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getDocumentDashboardMetrics(): Promise<DocumentDashboardMetrics> {
  const supabase = await createClient();
  const { start, end } = getMonthBounds();

  const { data, error } = await supabase
    .from("document_tasks")
    .select("*")
    .is("archived_at", null);

  if (error) throw error;

  const tasks = (data ?? []).map((row) => mapDocumentTask(row as Record<string, unknown>));

  let unpaidBalance = 0;
  let monthlyRevenue = 0;
  let monthlyProfit = 0;

  for (const task of tasks) {
    const summary = getDocumentFinanceSummary(task);
    unpaidBalance += summary.outstandingBalance;

    const completedAt = task.completed_at;
    if (
      completedAt &&
      completedAt >= start &&
      completedAt <= end &&
      COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ) {
      monthlyRevenue += summary.servicePrice;
      monthlyProfit += summary.profit;
    }
  }

  return {
    activeTasks: tasks.filter((task) =>
      ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ).length,
    newTasks: tasks.filter((task) => task.status === "NEW").length,
    overdueTasks: tasks.filter((task) => isTaskOverdue(task)).length,
    waitingClient: tasks.filter((task) => task.status === "WAITING_CLIENT").length,
    waitingOffice: tasks.filter((task) => task.status === "WAITING_OFFICE").length,
    completedThisMonth: tasks.filter((task) => {
      const completedAt = task.completed_at;
      return (
        completedAt &&
        completedAt >= start &&
        completedAt <= end &&
        COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
      );
    }).length,
    unpaidBalance,
    monthlyRevenue,
    monthlyProfit,
  };
}

export async function getDocumentDashboardAlerts(
  labels: {
    overdue: (id: number) => string;
    dueToday: (id: number) => string;
    dueSoon: (id: number) => string;
    completedUnpaid: (id: number) => string;
    readyForDelivery: (id: number) => string;
  }
): Promise<DocumentDashboardAlert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select("*")
    .is("archived_at", null);

  if (error) throw error;

  const tasks = (data ?? []).map((row) => mapDocumentTask(row as Record<string, unknown>));
  const alerts: DocumentDashboardAlert[] = [];

  for (const task of tasks) {
    const href = `/documents/${task.id}`;
    if (isTaskOverdue(task)) {
      alerts.push({
        id: `overdue-${task.id}`,
        kind: "overdue",
        taskId: task.id,
        title: labels.overdue(task.id),
        href,
      });
    } else if (isTaskDueToday(task)) {
      alerts.push({
        id: `due-today-${task.id}`,
        kind: "due_today",
        taskId: task.id,
        title: labels.dueToday(task.id),
        href,
      });
    } else if (isTaskDueWithinDays(task, 3)) {
      alerts.push({
        id: `due-soon-${task.id}`,
        kind: "due_soon",
        taskId: task.id,
        title: labels.dueSoon(task.id),
        href,
      });
    }

    if (isCompletedButUnpaid(task)) {
      alerts.push({
        id: `completed-unpaid-${task.id}`,
        kind: "completed_unpaid",
        taskId: task.id,
        title: labels.completedUnpaid(task.id),
        href,
      });
    }

    if (isReadyForDelivery(task)) {
      alerts.push({
        id: `ready-delivery-${task.id}`,
        kind: "ready_for_delivery",
        taskId: task.id,
        title: labels.readyForDelivery(task.id),
        href,
      });
    }
  }

  return alerts.slice(0, 20);
}

export async function getClientDocumentSummary(clientId: number) {
  const tasks = await getDocumentTasksByClientId(clientId);
  const active = tasks.filter((task) => isTaskActive(task) && !isTaskArchived(task) &&
    !COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never));
  const completed = tasks.filter((task) =>
    COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
  const unpaidBalance = tasks.reduce((sum, task) => {
    return sum + getDocumentFinanceSummary(task).outstandingBalance;
  }, 0);

  return { active, completed, unpaidBalance, all: tasks };
}

export type { DocumentTask };
