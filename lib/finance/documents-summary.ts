import { COMPLETED_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { isDateWithinPeriod, type DashboardPeriodBounds } from "@/lib/dashboard/period";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type DocumentsFinanceSummary = {
  revenue: number;
  expenses: number;
  profit: number;
  paidRevenue: number;
  unpaidRevenue: number;
  completedCount: number;
  averageOrderValue: number;
  /** True when service_price and cost_price support margin calculation. */
  profitSupported: boolean;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Completed document tasks recognized for accrual finance in the selected period. */
export function isRecognizedDocumentTaskForFinance(
  task: DocumentTaskWithRelations,
  bounds: DashboardPeriodBounds
): boolean {
  if (task.archived_at) return false;
  if (!COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)) return false;

  const completedAt = task.completed_at?.slice(0, 10);
  if (!completedAt || !isDateWithinPeriod(completedAt, bounds)) return false;

  const finance = getDocumentFinanceSummary(task);
  if (
    finance.servicePrice <= 0 &&
    finance.costPrice <= 0 &&
    !finance.usesServiceRows
  ) {
    return false;
  }

  return true;
}

/**
 * Canonical Documents finance rollup for Finance Center and Owner Dashboard.
 *
 * Revenue recognition: service_price on completed tasks (completed_at in period).
 * Profit: revenue − cost_price (internal costs entered on task / line items).
 * Payment status is tracked separately (paid vs outstanding receivables).
 */
export function getDocumentsFinanceSummary(input: {
  tasks: DocumentTaskWithRelations[];
  bounds: DashboardPeriodBounds;
}): DocumentsFinanceSummary {
  let revenue = 0;
  let expenses = 0;
  let paidRevenue = 0;
  let completedCount = 0;

  for (const task of input.tasks) {
    if (!isRecognizedDocumentTaskForFinance(task, input.bounds)) continue;

    const finance = getDocumentFinanceSummary(task);
    revenue += finance.servicePrice;
    expenses += finance.costPrice;
    paidRevenue += Math.min(finance.paidAmount, finance.servicePrice);
    completedCount += 1;
  }

  revenue = roundMoney(revenue);
  expenses = roundMoney(expenses);
  paidRevenue = roundMoney(paidRevenue);
  const profit = roundMoney(revenue - expenses);
  const unpaidRevenue = roundMoney(Math.max(revenue - paidRevenue, 0));

  return {
    revenue,
    expenses,
    profit,
    paidRevenue,
    unpaidRevenue,
    completedCount,
    averageOrderValue:
      completedCount > 0 ? roundMoney(revenue / completedCount) : 0,
    profitSupported: true,
  };
}
