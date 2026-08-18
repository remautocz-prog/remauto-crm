import { COMPLETED_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import { isDateWithinPeriod, type DashboardPeriodBounds } from "@/lib/dashboard/period";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

/** Final operational statuses where customer work is done (issued/delivered to customer). */
export function isDocumentTaskFinalStatus(
  task: Pick<DocumentTaskWithRelations, "status">
): boolean {
  return COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never);
}

export function isDocumentTaskCancelled(
  task: Pick<DocumentTaskWithRelations, "status">
): boolean {
  return task.status === "CANCELLED";
}

/**
 * Canonical completion/recognition date for finance period filters.
 * Prefers completed_at, then delivered_at, then ready_at.
 * Falls back to updated_at only when status is already final but dates are missing.
 */
export function getDocumentTaskRecognitionDate(
  task: Pick<
    DocumentTaskWithRelations,
    "status" | "completed_at" | "delivered_at" | "ready_at" | "updated_at"
  >
): string | null {
  if (task.completed_at) return task.completed_at.slice(0, 10);
  if (task.delivered_at) return task.delivered_at.slice(0, 10);
  if (task.ready_at) return task.ready_at.slice(0, 10);
  if (isDocumentTaskFinalStatus(task)) {
    return task.updated_at.slice(0, 10);
  }
  return null;
}

export function hasDocumentTaskFinancialValues(
  task: Pick<DocumentTaskWithRelations, "service_price" | "cost_price" | "paid_amount" | "payment_status" | "services">
): boolean {
  const finance = getDocumentFinanceSummary(task);
  return (
    finance.servicePrice > 0 ||
    finance.costPrice > 0 ||
    finance.usesServiceRows
  );
}

/** Fully paid per canonical payment logic (paid_amount vs resolved service price). */
export function isDocumentTaskFullyPaid(
  task: Pick<
    DocumentTaskWithRelations,
    "service_price" | "cost_price" | "paid_amount" | "payment_status" | "services"
  >
): boolean {
  return getDocumentFinanceSummary(task).paymentStatus === "paid";
}

/**
 * Cash-completed realized profit recognition:
 * final status + fully paid + valid financial values + recognition date in period.
 */
export function isDocumentTaskFinanciallyRecognized(
  task: DocumentTaskWithRelations,
  bounds: DashboardPeriodBounds
): boolean {
  if (task.archived_at) return false;
  if (isDocumentTaskCancelled(task)) return false;
  if (!isDocumentTaskFinalStatus(task)) return false;
  if (!isDocumentTaskFullyPaid(task)) return false;
  if (!hasDocumentTaskFinancialValues(task)) return false;

  const recognitionDate = getDocumentTaskRecognitionDate(task);
  if (!recognitionDate || !isDateWithinPeriod(recognitionDate, bounds)) {
    return false;
  }

  return true;
}

/** Final tasks in period with outstanding customer balance (receivables metric). */
export function isDocumentTaskFinalReceivableInPeriod(
  task: DocumentTaskWithRelations,
  bounds: DashboardPeriodBounds
): boolean {
  if (task.archived_at) return false;
  if (isDocumentTaskCancelled(task)) return false;
  if (!isDocumentTaskFinalStatus(task)) return false;
  if (isDocumentTaskFullyPaid(task)) return false;
  if (!hasDocumentTaskFinancialValues(task)) return false;

  const recognitionDate = getDocumentTaskRecognitionDate(task);
  if (!recognitionDate || !isDateWithinPeriod(recognitionDate, bounds)) {
    return false;
  }

  return getDocumentFinanceSummary(task).outstandingBalance > 0;
}
