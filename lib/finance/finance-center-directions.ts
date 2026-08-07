import { isCarSold, shouldCountStatsProfit } from "@/lib/cars/business-rules";
import { isDateWithinPeriod, type DashboardPeriodBounds } from "@/lib/dashboard/period";
import { computeCombinedRealizedResult } from "@/lib/finance/combined-summary";
import { computeCarsFinanceSummary } from "@/lib/finance/cars-summary";
import {
  EMPTY_DETAILING_FINANCE_SUMMARY,
  mapDetailingFinanceReportToSummary,
  type DetailingFinanceSummary,
} from "@/lib/finance/detailing-summary";
import { getDocumentsFinanceSummary, type DocumentsFinanceSummary } from "@/lib/finance/documents-summary";
import {
  buildPeriodComparison,
  type PeriodComparison,
} from "@/lib/finance/period-comparison";
import { getDetailingFinanceReport } from "@/lib/queries/detailing";
import type { Car } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { CarsFinanceSummary } from "@/lib/finance/cars-summary";
import type { FinanceDirectionSummary } from "@/lib/finance/finance-center-insights";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Vehicle expenses attached to cars sold in the selected period (display only). */
export function computeCarsRealizedExpensesInPeriod(input: {
  cars: Car[];
  expensesByCar: Map<number, number>;
  bounds: DashboardPeriodBounds;
}): number {
  let total = 0;

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10) ?? null;
    if (!isDateWithinPeriod(saleDate, input.bounds)) continue;
    total += input.expensesByCar.get(car.id) ?? 0;
  }

  return roundMoney(total);
}

export type FinanceBusinessDirectionCards = {
  cars: {
    profit: number;
    expenses: number;
    soldCount: number;
  };
  detailing: DetailingFinanceSummary;
  documents: DocumentsFinanceSummary;
};

export const EMPTY_BUSINESS_DIRECTIONS: FinanceBusinessDirectionCards = {
  cars: { profit: 0, expenses: 0, soldCount: 0 },
  detailing: EMPTY_DETAILING_FINANCE_SUMMARY,
  documents: {
    revenue: 0,
    expenses: 0,
    profit: 0,
    paidRevenue: 0,
    unpaidRevenue: 0,
    completedCount: 0,
    averageOrderValue: 0,
    profitSupported: true,
  },
};

export type BusinessDirectionComparisons = {
  cars: PeriodComparison | null;
  detailing: PeriodComparison | null;
  documents: PeriodComparison | null;
};

export async function loadBusinessDirectionsForPeriod(input: {
  bounds: DashboardPeriodBounds;
  cars: Car[];
  expensesByCar: Map<number, number>;
  tasks: DocumentTaskWithRelations[];
}): Promise<FinanceBusinessDirectionCards> {
  if (!input.bounds.start || !input.bounds.end) {
    return EMPTY_BUSINESS_DIRECTIONS;
  }

  const carsSummary = computeCarsFinanceSummary({
    cars: input.cars,
    expensesByCar: input.expensesByCar,
    bounds: input.bounds,
  });
  const report = await getDetailingFinanceReport({
    date_from: input.bounds.start,
    date_to: input.bounds.end,
  });
  const detailing = mapDetailingFinanceReportToSummary(report);
  const documents = getDocumentsFinanceSummary({
    tasks: input.tasks,
    bounds: input.bounds,
  });
  const carsRealizedExpenses = computeCarsRealizedExpensesInPeriod({
    cars: input.cars,
    expensesByCar: input.expensesByCar,
    bounds: input.bounds,
  });

  return buildFinanceBusinessDirectionCards({
    cars: carsSummary,
    carsRealizedExpenses,
    detailing,
    documents,
  });
}

export function buildBusinessDirectionComparisons(input: {
  current: FinanceBusinessDirectionCards;
  previous: FinanceBusinessDirectionCards;
}): BusinessDirectionComparisons {
  return {
    cars: buildPeriodComparison(
      input.current.cars.profit,
      input.previous.cars.profit
    ),
    detailing: buildPeriodComparison(
      input.current.detailing.netResult,
      input.previous.detailing.netResult
    ),
    documents: buildPeriodComparison(
      input.current.documents.profit,
      input.previous.documents.profit
    ),
  };
}

export function computeBusinessDirectionsCombinedResult(
  directions: FinanceBusinessDirectionCards
): number {
  return computeCombinedRealizedResult({
    carsRealizedProfit: directions.cars.profit,
    detailingNetResult: directions.detailing.netResult,
    documentsProfit: directions.documents.profit,
  });
}

export function buildFinanceBusinessDirectionCards(input: {
  cars: CarsFinanceSummary;
  carsRealizedExpenses: number;
  detailing: DetailingFinanceSummary;
  documents: DocumentsFinanceSummary;
}): FinanceBusinessDirectionCards {
  return {
    cars: {
      profit: input.cars.realizedProfit,
      expenses: input.carsRealizedExpenses,
      soldCount: input.cars.soldCount,
    },
    detailing: input.detailing,
    documents: input.documents,
  };
}

/** Chart rows — always three directions, same values as the business cards. */
export function buildFinanceDirectionChartSummary(input: {
  carsProfit: number;
  detailingNet: number;
  documentsProfit: number;
}): FinanceDirectionSummary[] {
  return [
    {
      id: "cars",
      labelKey: "directionCars",
      profit: roundMoney(input.carsProfit),
    },
    {
      id: "detailing",
      labelKey: "directionDetailing",
      profit: roundMoney(input.detailingNet),
    },
    {
      id: "documents",
      labelKey: "directionDocuments",
      profit: roundMoney(input.documentsProfit),
    },
  ];
}
