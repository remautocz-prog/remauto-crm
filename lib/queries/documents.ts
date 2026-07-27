import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
  TERMINAL_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import {
  derivePaymentStatus,
  getDocumentFinanceSummary,
  getTaskServiceLabel,
  hasTaskDeadline,
  isCompletedButUnpaid,
  isReadyForDelivery,
  isTaskActive,
  isTaskActiveForDeadline,
  isTaskArchived,
  isTaskDueThisWeek,
  isTaskDueToday,
  isTaskDueWithinDays,
  isTaskOverdue,
  isTaskUnassigned,
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import {
  compareDeadlineLatest,
  compareDeadlineNearest,
  getPragueTodayDateString,
} from "@/lib/documents/deadline";
import { comparePriority } from "@/lib/documents/priority-styles";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { getClientDisplayName } from "@/lib/clients/validation";
import type {
  DocumentDashboardAlert,
  DocumentDashboardMetrics,
  DocumentEmployeeWorkload,
  DocumentTask,
  DocumentTasksListParams,
  DocumentTaskWithRelations,
  DocumentTodaysWorkItem,
} from "@/lib/types/documents";

const TASK_SELECT = `
  *,
  clients:client_id ( id, full_name, company, phone, email, client_type ),
  cars:car_id ( id, brand, model, year, vin, registration_number, client_id ),
  assignee:assigned_to ( id, full_name ),
  document_task_services ( * )
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

  if (task.services?.length) {
    for (const service of task.services) {
      if (service.service_name.toLowerCase().includes(term)) return true;
    }
  }

  const service = getTaskServiceLabel(task).toLowerCase();
  if (service.includes(term)) return true;
  if (task.custom_service_name?.toLowerCase().includes(term)) return true;

  return false;
}

function sortTasks(tasks: DocumentTaskWithRelations[], sort?: string) {
  const copy = [...tasks];
  const today = getPragueTodayDateString();
  switch (sort) {
    case "oldest":
      return copy.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "closest_deadline":
      return copy.sort((a, b) => compareDeadlineNearest(a, b, today));
    case "deadline_latest":
      return copy.sort((a, b) => compareDeadlineLatest(a, b));
    case "overdue_first":
      return copy.sort((a, b) => {
        const aOverdue = isTaskOverdue(a, today) ? 1 : 0;
        const bOverdue = isTaskOverdue(b, today) ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        return compareDeadlineNearest(a, b, today);
      });
    case "employee_name":
      return copy.sort((a, b) => {
        const aName = a.assignee?.full_name?.trim() || "\uffff";
        const bName = b.assignee?.full_name?.trim() || "\uffff";
        return aName.localeCompare(bName);
      });
    case "highest_price":
      return copy.sort((a, b) => {
        const aPrice = getDocumentFinanceSummary(a).servicePrice;
        const bPrice = getDocumentFinanceSummary(b).servicePrice;
        return bPrice - aPrice;
      });
    case "client_name":
      return copy.sort((a, b) => {
        const aName = a.client ? getClientDisplayName(a.client) : "";
        const bName = b.client ? getClientDisplayName(b.client) : "";
        return aName.localeCompare(bName);
      });
    case "priority_high_first":
      return copy.sort((a, b) => comparePriority(a.priority, b.priority, "high_first"));
    case "priority_low_first":
      return copy.sort((a, b) => comparePriority(a.priority, b.priority, "low_first"));
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

  if (params.due_today) {
    tasks = tasks.filter((task) => isTaskDueToday(task));
  }

  if (params.due_this_week) {
    tasks = tasks.filter((task) => isTaskDueThisWeek(task));
  }

  if (params.no_deadline) {
    tasks = tasks.filter((task) => !hasTaskDeadline(task));
  }

  if (params.unassigned_only) {
    tasks = tasks.filter((task) => isTaskUnassigned(task));
  }

  if (params.outstanding_only) {
    tasks = tasks.filter(
      (task) => getDocumentFinanceSummary(task).outstandingBalance > 0
    );
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
    dueTodayTasks: tasks.filter((task) => isTaskDueToday(task)).length,
    unassignedActiveTasks: tasks.filter(
      (task) =>
        isTaskUnassigned(task) &&
        isTaskActiveForDeadline(task) &&
        ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ).length,
    waitingClient: tasks.filter((task) => task.status === "WAITING_CLIENT").length,
    waitingOffice: tasks.filter((task) => task.status === "WAITING_OFFICE").length,
    urgentActiveTasks: tasks.filter(
      (task) =>
        task.priority === "urgent" &&
        !TERMINAL_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ).length,
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

function isActiveDashboardTask(task: DocumentTask) {
  return (
    !task.archived_at &&
    isTaskActiveForDeadline(task) &&
    ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

function compareTodaysWork(
  a: DocumentTaskWithRelations,
  b: DocumentTaskWithRelations,
  today: string
) {
  const overdueDiff =
    Number(isTaskOverdue(b, today)) - Number(isTaskOverdue(a, today));
  if (overdueDiff !== 0) return overdueDiff;

  const dueTodayDiff =
    Number(isTaskDueToday(b, today)) - Number(isTaskDueToday(a, today));
  if (dueTodayDiff !== 0) return dueTodayDiff;

  const urgentDiff =
    Number(b.priority === "urgent") - Number(a.priority === "urgent");
  if (urgentDiff !== 0) return urgentDiff;

  return compareDeadlineNearest(a, b, today);
}

export async function getDocumentTodaysWork(
  limit = 10
): Promise<DocumentTodaysWorkItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_SELECT)
    .is("archived_at", null);

  if (error) throw error;

  const today = getPragueTodayDateString();
  const tasks = (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter(isActiveDashboardTask)
    .sort((a, b) => compareTodaysWork(a, b, today));

  return tasks.slice(0, limit);
}

export async function getDocumentEmployeeWorkload(): Promise<DocumentEmployeeWorkload[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_SELECT)
    .is("archived_at", null);

  if (error) throw error;

  const tasks = (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter(isActiveDashboardTask);

  const workload = new Map<string, DocumentEmployeeWorkload>();

  for (const task of tasks) {
    if (!task.assigned_to) continue;
    const employeeId = task.assigned_to;
    const existing = workload.get(employeeId) ?? {
      employeeId,
      employeeName: task.assignee?.full_name?.trim() || employeeId,
      activeOrders: 0,
      overdueOrders: 0,
      dueTodayOrders: 0,
      urgentOrders: 0,
    };

    existing.activeOrders += 1;
    if (isTaskOverdue(task)) existing.overdueOrders += 1;
    if (isTaskDueToday(task)) existing.dueTodayOrders += 1;
    if (task.priority === "urgent") existing.urgentOrders += 1;

    workload.set(employeeId, existing);
  }

  return Array.from(workload.values()).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );
}

export async function getClientDocumentSummary(clientId: number) {
  const tasks = await getDocumentTasksByClientId(clientId);
  const active = tasks.filter(
    (task) =>
      isTaskActive(task) &&
      !isTaskArchived(task) &&
      !TERMINAL_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
  const completed = tasks.filter((task) =>
    COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
  const unpaidBalance = tasks.reduce((sum, task) => {
    return sum + getDocumentFinanceSummary(task).outstandingBalance;
  }, 0);

  return { active, completed, unpaidBalance, all: tasks };
}

export type { DocumentTask };
