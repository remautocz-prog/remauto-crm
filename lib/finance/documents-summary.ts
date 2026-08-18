import {
  getDocumentFinanceSummary,
} from "@/lib/documents/helpers";
import {
  isDocumentTaskFinalReceivableInPeriod,
  isDocumentTaskFinanciallyRecognized,
} from "@/lib/documents/finance-recognition";
import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
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

/** @deprecated Prefer isDocumentTaskFinanciallyRecognized — kept for existing imports. */
export const isRecognizedDocumentTaskForFinance = isDocumentTaskFinanciallyRecognized;

/**
 * Canonical Documents finance rollup for Finance Center and Owner Dashboard.
 *
 * Realized profit (cash-completed): final status + fully paid + recognition date in period.
 * Revenue = resolved service_price; profit = revenue − resolved cost_price.
 * Unpaid revenue = outstanding balance on final but unpaid/partial tasks in period.
 */
export function getDocumentsFinanceSummary(input: {
  tasks: DocumentTaskWithRelations[];
  bounds: DashboardPeriodBounds;
}): DocumentsFinanceSummary {
  let revenue = 0;
  let expenses = 0;
  let paidRevenue = 0;
  let unpaidRevenue = 0;
  let completedCount = 0;

  for (const task of input.tasks) {
    if (isDocumentTaskFinanciallyRecognized(task, input.bounds)) {
      const finance = getDocumentFinanceSummary(task);
      revenue += finance.servicePrice;
      expenses += finance.costPrice;
      paidRevenue += finance.servicePrice;
      completedCount += 1;
      continue;
    }

    if (isDocumentTaskFinalReceivableInPeriod(task, input.bounds)) {
      const finance = getDocumentFinanceSummary(task);
      unpaidRevenue += finance.outstandingBalance;
    }
  }

  revenue = roundMoney(revenue);
  expenses = roundMoney(expenses);
  paidRevenue = roundMoney(paidRevenue);
  unpaidRevenue = roundMoney(unpaidRevenue);
  const profit = roundMoney(revenue - expenses);

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
