import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import {
  isDateWithinPeriod,
  type DashboardPeriodBounds,
} from "@/lib/dashboard/period";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeDocumentsRealizedProfit(
  tasks: DocumentTaskWithRelations[],
  bounds: DashboardPeriodBounds
): number {
  let total = 0;

  for (const task of tasks) {
    const completedAt = task.completed_at?.slice(0, 10);
    if (!completedAt || !isDateWithinPeriod(completedAt, bounds)) continue;

    const finance = getDocumentFinanceSummary(task);
    if (
      finance.servicePrice <= 0 &&
      finance.costPrice <= 0 &&
      !finance.usesServiceRows
    ) {
      continue;
    }
    total += finance.profit;
  }

  return roundMoney(total);
}

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
