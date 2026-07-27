import {
  COMPLETED_DOCUMENT_TASK_STATUSES,
  DEFAULT_DOCUMENT_PAYMENT_STATUS,
  DEFAULT_DOCUMENT_PRIORITY,
  TERMINAL_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import { parseChecklistJson } from "@/lib/documents/checklists";
import {
  calculateOutstandingBalance,
  derivePaymentStatus,
} from "@/lib/documents/payment";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import {
  resolveDocumentVehicleMode,
} from "@/lib/documents/vehicle";
import type {
  ChecklistItem,
  DocumentTask,
  DocumentTaskFinanceSummary,
  DocumentTaskWithRelations,
} from "@/lib/types/documents";

export function getTaskDueDate(task: Pick<DocumentTask, "due_date" | "deadline">): string | null {
  return task.due_date ?? task.deadline ?? null;
}

export function mapDocumentTask(row: Record<string, unknown>): DocumentTask {
  const serviceType =
    (row.service_type as DocumentTask["service_type"]) ??
    (row.work_type as DocumentTask["work_type"]) ??
    null;
  const workType =
    (row.work_type as DocumentTask["work_type"]) ?? serviceType;

  return {
    id: Number(row.id),
    client_id: row.client_id != null ? Number(row.client_id) : null,
    car_id: row.car_id != null ? Number(row.car_id) : null,
    vehicle_mode: resolveDocumentVehicleMode({
      vehicle_mode: row.vehicle_mode as DocumentTask["vehicle_mode"],
      car_id: row.car_id != null ? Number(row.car_id) : null,
    }),
    vehicle_vin: (row.vehicle_vin as string | null) ?? null,
    vehicle_plate: (row.vehicle_plate as string | null) ?? null,
    vehicle_brand: (row.vehicle_brand as string | null) ?? null,
    vehicle_model: (row.vehicle_model as string | null) ?? null,
    vehicle_year: row.vehicle_year != null ? Number(row.vehicle_year) : null,
    service_type: serviceType,
    work_type: workType,
    custom_service_name: (row.custom_service_name as string | null) ?? null,
    assigned_to: (row.assigned_to as string | null) ?? null,
    status: normalizeDocumentTaskStatus(row.status as string | null | undefined),
    priority: (row.priority as DocumentTask["priority"]) ?? DEFAULT_DOCUMENT_PRIORITY,
    started_at: (row.started_at as string | null) ?? null,
    due_date: (row.due_date as string | null) ?? null,
    deadline: (row.deadline as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    service_price: row.service_price != null ? Number(row.service_price) : null,
    cost_price: row.cost_price != null ? Number(row.cost_price) : null,
    paid_amount: row.paid_amount != null ? Number(row.paid_amount) : 0,
    payment_status:
      (row.payment_status as DocumentTask["payment_status"]) ??
      DEFAULT_DOCUMENT_PAYMENT_STATUS,
    paid_at: (row.paid_at as string | null) ?? null,
    payment_method: (row.payment_method as DocumentTask["payment_method"]) ?? null,
    document_count: row.document_count != null ? Number(row.document_count) : 0,
    required_documents: parseChecklistJson(row.required_documents),
    received_documents: parseChecklistJson(row.received_documents),
    notes: (row.notes as string | null) ?? null,
    result_notes: (row.result_notes as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export { calculateOutstandingBalance, derivePaymentStatus } from "@/lib/documents/payment";

export function calculateDocumentProfit(
  servicePrice: number | null | undefined,
  costPrice: number | null | undefined
) {
  return Number(servicePrice ?? 0) - Number(costPrice ?? 0);
}

export function getDocumentFinanceSummary(
  task: Pick<
    DocumentTask,
    "service_price" | "cost_price" | "paid_amount" | "payment_status"
  >
): DocumentTaskFinanceSummary {
  const servicePrice = Number(task.service_price ?? 0);
  const costPrice = Number(task.cost_price ?? 0);
  const paidAmount = Number(task.paid_amount ?? 0);

  return {
    servicePrice,
    costPrice,
    paidAmount,
    outstandingBalance: calculateOutstandingBalance(servicePrice, paidAmount),
    profit: calculateDocumentProfit(servicePrice, costPrice),
    paymentStatus: derivePaymentStatus(paidAmount, servicePrice),
  };
}

export function isTaskOverdue(task: DocumentTask, today = new Date()): boolean {
  if (TERMINAL_DOCUMENT_TASK_STATUSES.includes(task.status as never)) return false;
  const due = getTaskDueDate(task);
  if (!due) return false;
  const dueDate = new Date(due);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < today.getTime();
}

export function isTaskDueToday(task: DocumentTask, today = new Date()): boolean {
  const due = getTaskDueDate(task);
  if (!due) return false;
  const dueDate = new Date(due);
  return (
    dueDate.getFullYear() === today.getFullYear() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getDate() === today.getDate()
  );
}

export function isTaskDueWithinDays(task: DocumentTask, days: number, today = new Date()) {
  const due = getTaskDueDate(task);
  if (!due) return false;
  const dueDate = new Date(due);
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= end.getTime();
}

export function isTaskActive(task: DocumentTask) {
  return !task.archived_at;
}

export function isTaskArchived(task: DocumentTask) {
  return Boolean(task.archived_at);
}

export function isTaskCompleted(task: DocumentTask) {
  return COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never);
}

export function isReadyForDelivery(task: DocumentTask) {
  return task.status === "COMPLETED";
}

export function isCompletedButUnpaid(task: DocumentTask) {
  if (!isTaskCompleted(task)) return false;
  const summary = getDocumentFinanceSummary(task);
  return summary.paymentStatus !== "paid" && summary.outstandingBalance > 0;
}

export function getTaskServiceLabel(
  task: Pick<DocumentTask, "service_type" | "work_type" | "custom_service_name">
) {
  const serviceType = task.service_type ?? task.work_type;
  if (serviceType === "custom") {
    return task.custom_service_name?.trim() || "custom";
  }
  return serviceType ?? "";
}

export function mergeTaskRelations(
  task: DocumentTask,
  row: Record<string, unknown>
): DocumentTaskWithRelations {
  const client = row.clients as DocumentTaskWithRelations["client"];
  const car = row.cars as DocumentTaskWithRelations["car"];
  const assignee = row.assignee as DocumentTaskWithRelations["assignee"];
  return { ...task, client: client ?? null, car: car ?? null, assignee: assignee ?? null };
}

export function normalizeChecklistForPayload(items: ChecklistItem[] | undefined): ChecklistItem[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    key: item.key,
    ...(item.custom ? { custom: true } : {}),
    ...(item.label?.trim() ? { label: item.label.trim() } : {}),
  }));
}
