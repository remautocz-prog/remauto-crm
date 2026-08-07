import { getDocumentsFinanceSummary } from "@/lib/finance/documents-summary";
import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeDocumentsRealizedProfit(
  tasks: DocumentTaskWithRelations[],
  bounds: DashboardPeriodBounds
): number {
  return getDocumentsFinanceSummary({ tasks, bounds }).profit;
}

export { getDocumentsFinanceSummary } from "@/lib/finance/documents-summary";
export type { DocumentsFinanceSummary } from "@/lib/finance/documents-summary";

export function computeCombinedRealizedResult(input: {
  carsRealizedProfit: number;
  detailingNetResult: number;
  documentsProfit?: number;
}): number {
  return roundMoney(
    input.carsRealizedProfit +
      input.detailingNetResult +
      (input.documentsProfit ?? 0)
  );
}
