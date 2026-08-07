import "server-only";

import { getCurrentUserAccess, hasPermission, requirePermission } from "@/lib/auth/access";
import {
  buildAdminAttentionResult,
  countAdminRequiresAttention,
} from "@/lib/dashboard/admin-attention";
import { buildStuckProcessItems } from "@/lib/dashboard/admin-stuck-processes";
import {
  buildDetailingTeamWorkload,
  buildDocumentsTeamWorkload,
} from "@/lib/dashboard/admin-team-workload";
import { ACTIVE_DETAILING_ORDER_STATUSES } from "@/lib/constants/detailing";
import { ACTIVE_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import {
  DETAILING_ORDER_SELECT,
  hydrateDetailingOrdersWithServices,
} from "@/lib/detailing/order-services-loader";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import {
  isTaskActiveForDeadline,
  isTaskDueToday,
  isTaskOverdue,
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import { sortOverdueTasks } from "@/lib/dashboard/owner-metrics";
import {
  getTodayDetailingAppointments,
  mapDetailingOrder,
} from "@/lib/queries/detailing";
import { loadOwnerAttentionData } from "@/lib/queries/owner-attention";
import { createClient } from "@/lib/supabase/server";
import type { Car } from "@/lib/types/cars";
import type {
  AdminDashboardData,
  AdminDashboardSectionErrors,
  AdminOperationalKpis,
  AdminOptionalFinanceKpis,
} from "@/lib/types/admin-dashboard";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

const TASK_WORKLOAD_SELECT = `
  id,
  status,
  priority,
  due_date,
  deadline,
  created_at,
  archived_at,
  assigned_to,
  service_type,
  work_type,
  custom_service_name
`;

const CAR_TODAY_SELECT =
  "id, brand, model, year, status, sale_date, registration_number, stock_number, client_id";

function mapTaskRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  return mergeTaskRelations(mapDocumentTask(row), row);
}

function isActiveDocumentTask(task: DocumentTaskWithRelations) {
  return (
    !task.archived_at &&
    isTaskActiveForDeadline(task) &&
    ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

function isActiveDetailingOrder(order: DetailingOrderWithServices) {
  return (
    !order.archived_at &&
    ACTIVE_DETAILING_ORDER_STATUSES.includes(order.status)
  );
}

async function loadDocumentTasksForAdmin(): Promise<{
  tasks: DocumentTaskWithRelations[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_WORKLOAD_SELECT)
    .is("archived_at", null);

  if (error) return { tasks: [], error: true };
  return {
    tasks: (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>)),
    error: false,
  };
}

async function loadDetailingOrdersForAdmin(): Promise<{
  orders: DetailingOrderWithServices[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) return { orders: [], error: true };

  try {
    const orders = await hydrateDetailingOrdersWithServices(
      (data ?? []).map((row) => mapDetailingOrder(row as Record<string, unknown>))
    );
    return { orders, error: false };
  } catch {
    return { orders: [], error: true };
  }
}

async function loadCarsSaleToday(today: string): Promise<{
  cars: Car[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select(CAR_TODAY_SELECT)
    .eq("sale_date", today);

  if (error) return { cars: [], error: true };
  return { cars: (data ?? []) as Car[], error: false };
}

async function loadTeamProfiles(): Promise<{
  documents: { id: string; full_name: string | null }[];
  detailing: { id: string; full_name: string | null }[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .in("role", ["documents", "detailing"])
    .order("full_name");

  if (error) {
    return { documents: [], detailing: [], error: true };
  }

  const documents: { id: string; full_name: string | null }[] = [];
  const detailing: { id: string; full_name: string | null }[] = [];

  for (const row of data ?? []) {
    const profile = {
      id: String(row.id),
      full_name: (row.full_name as string | null) ?? null,
    };
    if (row.role === "documents") documents.push(profile);
    if (row.role === "detailing") detailing.push(profile);
  }

  return { documents, detailing, error: false };
}

function computeOperationalKpis(input: {
  attentionItems: ReturnType<typeof buildAdminAttentionResult>["items"];
  tasks: DocumentTaskWithRelations[];
  orders: DetailingOrderWithServices[];
  today: string;
}): AdminOperationalKpis {
  const overdueDocuments = input.tasks.filter(
    (task) => isActiveDocumentTask(task) && isTaskOverdue(task, input.today)
  ).length;

  const detailingInProgress = input.orders.filter(isActiveDetailingOrder).length;

  const unpaidDetailing = input.orders.filter(
    (order) =>
      order.status === "delivered" &&
      (order.payment_status === "unpaid" ||
        order.payment_status === "partially_paid")
  ).length;

  const carsRequiringAction = input.attentionItems.filter(
    (item) =>
      item.module === "cars" &&
      (item.reasonCategory === "car_sold_missing_actual_price" ||
        item.reasonCategory === "car_active_missing_planned_price" ||
        item.reasonCategory === "car_long_in_stock")
  ).length;

  return {
    requiresAttention: countAdminRequiresAttention(input.attentionItems),
    overdueDocuments,
    detailingInProgress,
    unpaidDetailing,
    carsRequiringAction,
  };
}

function computeOptionalFinanceKpis(
  orders: DetailingOrderWithServices[]
): AdminOptionalFinanceKpis {
  const unpaidDetailingBalance = orders
    .filter(
      (order) =>
        order.status === "delivered" &&
        (order.payment_status === "unpaid" ||
          order.payment_status === "partially_paid")
    )
    .reduce((sum, order) => sum + (order.remaining_amount ?? 0), 0);

  return { unpaidDetailingBalance };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requirePermission("admin.dashboard");
  const today = getPragueTodayDateString();
  const errors: AdminDashboardSectionErrors = {};

  const [
    userAccess,
    rawAttention,
    documentsResult,
    detailingResult,
    carsTodayResult,
    teamProfiles,
    todayAppointments,
  ] = await Promise.all([
    getCurrentUserAccess(),
    loadOwnerAttentionData(),
    loadDocumentTasksForAdmin(),
    loadDetailingOrdersForAdmin(),
    loadCarsSaleToday(today),
    loadTeamProfiles(),
    getTodayDetailingAppointments().catch(() => [] as DetailingOrderWithServices[]),
  ]);

  const attention = buildAdminAttentionResult(rawAttention);
  if (documentsResult.error) errors.documents = true;
  if (detailingResult.error) errors.detailing = true;
  if (carsTodayResult.error) errors.cars = true;
  if (teamProfiles.error) errors.team = true;

  const tasks = documentsResult.error ? [] : documentsResult.tasks;
  const orders = detailingResult.error ? [] : detailingResult.orders;

  const kpis = computeOperationalKpis({
    attentionItems: attention.items,
    tasks,
    orders,
    today,
  });

  const canViewFinance = userAccess
    ? hasPermission(userAccess.role, "finance.view")
    : false;

  const optionalFinance = canViewFinance
    ? computeOptionalFinanceKpis(orders)
    : null;

  const attentionQuickActions = {
    documentsStatus: userAccess
      ? hasPermission(userAccess.role, "documents.update")
      : false,
    detailingPayment: userAccess
      ? hasPermission(userAccess.role, "detailing.payment.update")
      : false,
    detailingStatus: userAccess
      ? hasPermission(userAccess.role, "detailing.update")
      : false,
    carsStatus: userAccess ? hasPermission(userAccess.role, "cars.update") : false,
  };

  const documentsDueToday = tasks
    .filter(
      (task) => isActiveDocumentTask(task) && isTaskDueToday(task, today)
    )
    .slice(0, 8);

  const documentsOverdue = sortOverdueTasks(tasks, today).slice(0, 8);

  const detailingScheduledToday = todayAppointments.slice(0, 8);

  const detailingReady = orders
    .filter((order) => order.status === "ready")
    .slice(0, 8);

  const detailingCompletionToday = orders
    .filter((order) => {
      if (!isActiveDetailingOrder(order)) return false;
      const expected = order.expected_completion_at?.slice(0, 10);
      return expected === today;
    })
    .slice(0, 8);

  const teamWorkload = teamProfiles.error
    ? []
    : [
        ...buildDocumentsTeamWorkload(tasks, teamProfiles.documents, today),
        ...buildDetailingTeamWorkload(orders, teamProfiles.detailing, today),
      ].sort(
        (a, b) =>
          b.overdueCount - a.overdueCount ||
          b.criticalCount - a.criticalCount ||
          b.activeCount - a.activeCount
      );

  const stuckProcesses = buildStuckProcessItems(attention.items, 8);

  const quickActions = {
    canCreateDocument: userAccess
      ? hasPermission(userAccess.role, "documents.create")
      : false,
    canCreateDetailing: userAccess
      ? hasPermission(userAccess.role, "detailing.create")
      : false,
    canCreateCar: userAccess ? hasPermission(userAccess.role, "cars.create") : false,
  };

  return {
    kpis,
    optionalFinance,
    attention,
    attentionQuickActions,
    today: {
      documentsDueToday,
      documentsOverdue,
      detailingScheduledToday,
      detailingReady,
      detailingCompletionToday,
      carsSaleToday: carsTodayResult.error ? [] : carsTodayResult.cars,
    },
    teamWorkload,
    stuckProcesses,
    quickActions,
    errors,
  };
}
