import {
  calculateCarProfit,
  isCarSold,
  shouldCountStatsProfit,
} from "@/lib/cars/business-rules";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { getDocumentTaskRecognitionDate } from "@/lib/documents/finance-recognition";
import { isRecognizedDocumentTaskForFinance } from "@/lib/finance/documents-summary";
import { resolveOrderCommissionTotal } from "@/lib/detailing/finance-aggregation";
import {
  bucketDateForChart,
  buildChartBucketKeys,
  getChartGranularity,
  type ChartGranularity,
} from "@/lib/date-range/filter";
import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
import { getDashboardPeriodBounds } from "@/lib/dashboard/period";
import type { Car } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

export type ProfitTrendPoint = {
  date: string;
  profit: number;
};

export type ProfitDirectionBar = {
  id: "owned_cars" | "commission_cars" | "detailing" | "documents";
  labelKey:
    | "directionOwnedCars"
    | "directionCommissionCars"
    | "directionDetailing"
    | "directionDocuments";
  profit: number;
};

type DetailingExpenseRow = {
  amount: number | null;
  expense_date: string | null;
};

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const { year, month, day } = parseDateParts(date);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return formatUtcDate(next);
}

function deliveryDate(order: DetailingOrderWithServices) {
  const value = order.actual_completion_at ?? order.updated_at;
  return value ? value.slice(0, 10) : null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildDateRange(endDate: string, days: number) {
  const startDate = addDays(endDate, -(days - 1));
  const dates: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function computeDocumentTaskProfit(task: DocumentTaskWithRelations) {
  return getDocumentFinanceSummary(task).profit;
}

export function computeCombinedPeriodProfit(input: {
  bounds: DashboardPeriodBounds;
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingNet: number;
  documentTasks: DocumentTaskWithRelations[];
}) {
  if (!input.bounds.start || !input.bounds.end) return 0;
  const { start, end } = input.bounds;
  let carsProfit = 0;
  let documentsProfit = 0;

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10);
    if (!saleDate || saleDate < start || saleDate > end) continue;
    carsProfit += calculateCarProfit(
      car,
      input.expensesByCar.get(car.id) ?? 0
    ).netProfit;
  }

  for (const task of input.documentTasks) {
    if (!isRecognizedDocumentTaskForFinance(task, input.bounds)) {
      continue;
    }
    documentsProfit += computeDocumentTaskProfit(task);
  }

  return roundMoney(carsProfit + input.detailingNet + documentsProfit);
}

export function computeCombinedMonthlyProfit(input: {
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingNet: number;
  documentTasks: DocumentTaskWithRelations[];
  today: string;
}) {
  const bounds = getDashboardPeriodBounds("month", input.today);
  return computeCombinedPeriodProfit({
    bounds,
    cars: input.cars,
    expensesByCar: input.expensesByCar,
    detailingNet: input.detailingNet,
    documentTasks: input.documentTasks,
  });
}

export function buildProfitTrendSeries(input: {
  rangeStart: string;
  rangeEnd: string;
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingOrders: DetailingOrderWithServices[];
  detailingExpenses: DetailingExpenseRow[];
  documentTasks: DocumentTaskWithRelations[];
  granularity?: ChartGranularity;
}): ProfitTrendPoint[] {
  const granularity =
    input.granularity ??
    getChartGranularity(
      Math.max(
        1,
        Math.ceil(
          (new Date(input.rangeEnd).getTime() - new Date(input.rangeStart).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    );
  const bucketKeys = buildChartBucketKeys(
    input.rangeStart,
    input.rangeEnd,
    granularity
  );
  const profitByBucket = new Map<string, number>(
    bucketKeys.map((key) => [key, 0])
  );

  function addProfit(date: string, amount: number) {
    const bucket = bucketDateForChart(date, granularity);
    if (!bucket || !profitByBucket.has(bucket)) return;
    profitByBucket.set(bucket, (profitByBucket.get(bucket) ?? 0) + amount);
  }

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10);
    if (!saleDate || saleDate < input.rangeStart || saleDate > input.rangeEnd) continue;
    const profit = calculateCarProfit(
      car,
      input.expensesByCar.get(car.id) ?? 0
    ).netProfit;
    addProfit(saleDate, profit);
  }

  for (const order of input.detailingOrders) {
    if (order.status !== "delivered") continue;
    const date = deliveryDate(order);
    if (!date || date < input.rangeStart || date > input.rangeEnd) continue;
    const orderNet = order.final_price - resolveOrderCommissionTotal(order);
    addProfit(date, orderNet);
  }

  for (const row of input.detailingExpenses) {
    const date = row.expense_date?.slice(0, 10);
    if (!date || date < input.rangeStart || date > input.rangeEnd) continue;
    addProfit(date, -Number(row.amount ?? 0));
  }

  for (const task of input.documentTasks) {
    if (!isRecognizedDocumentTaskForFinance(task, { start: input.rangeStart, end: input.rangeEnd })) {
      continue;
    }
    const recognitionDate = getDocumentTaskRecognitionDate(task);
    if (!recognitionDate) continue;
    addProfit(recognitionDate, computeDocumentTaskProfit(task));
  }

  return bucketKeys.map((date) => ({
    date,
    profit: roundMoney(profitByBucket.get(date) ?? 0),
  }));
}

export function buildProfitDirectionBars(input: {
  bounds: DashboardPeriodBounds;
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingNet: number;
  documentTasks: DocumentTaskWithRelations[];
}): ProfitDirectionBar[] {
  if (!input.bounds.start || !input.bounds.end) return [];
  const bounds = input.bounds;
  let ownedProfit = 0;
  let commissionProfit = 0;
  let hasOwned = false;
  let hasCommission = false;
  let documentsProfit = 0;
  let hasDocumentFinancials = false;

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10);
    if (!saleDate || saleDate < bounds.start! || saleDate > bounds.end!) continue;
    const profit = calculateCarProfit(
      car,
      input.expensesByCar.get(car.id) ?? 0
    ).netProfit;

    if (car.business_model === "owned") {
      hasOwned = true;
      ownedProfit += profit;
    } else if (car.business_model === "commission") {
      hasCommission = true;
      commissionProfit += profit;
    }
  }

  for (const task of input.documentTasks) {
    if (!isRecognizedDocumentTaskForFinance(task, bounds)) {
      continue;
    }
    const finance = getDocumentFinanceSummary(task);
    if (finance.servicePrice > 0 || finance.costPrice > 0 || finance.usesServiceRows) {
      hasDocumentFinancials = true;
      documentsProfit += finance.profit;
    }
  }

  const bars: ProfitDirectionBar[] = [];

  if (hasOwned) {
    bars.push({
      id: "owned_cars",
      labelKey: "directionOwnedCars",
      profit: roundMoney(ownedProfit),
    });
  }

  if (hasCommission) {
    bars.push({
      id: "commission_cars",
      labelKey: "directionCommissionCars",
      profit: roundMoney(commissionProfit),
    });
  }

  bars.push({
    id: "detailing",
    labelKey: "directionDetailing",
    profit: roundMoney(input.detailingNet),
  });

  if (hasDocumentFinancials) {
    bars.push({
      id: "documents",
      labelKey: "directionDocuments",
      profit: roundMoney(documentsProfit),
    });
  }

  return bars;
}
