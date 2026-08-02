import {
  calculateCarProfit,
  isCarSold,
  shouldCountStatsProfit,
} from "@/lib/cars/business-rules";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { resolveOrderCommissionTotal } from "@/lib/detailing/finance-aggregation";
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

export function computeCombinedMonthlyProfit(input: {
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingNet: number;
  documentTasks: DocumentTaskWithRelations[];
  today: string;
}) {
  const bounds = getDashboardPeriodBounds("month", input.today);
  let carsProfit = 0;
  let documentsProfit = 0;

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10);
    if (!saleDate || saleDate < bounds.start! || saleDate > bounds.end!) continue;
    carsProfit += calculateCarProfit(
      car,
      input.expensesByCar.get(car.id) ?? 0
    ).netProfit;
  }

  for (const task of input.documentTasks) {
    const completedAt = task.completed_at?.slice(0, 10);
    if (!completedAt || completedAt < bounds.start! || completedAt > bounds.end!) {
      continue;
    }
    documentsProfit += computeDocumentTaskProfit(task);
  }

  return roundMoney(carsProfit + input.detailingNet + documentsProfit);
}

export function buildProfitTrendSeries(input: {
  today: string;
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingOrders: DetailingOrderWithServices[];
  detailingExpenses: DetailingExpenseRow[];
  documentTasks: DocumentTaskWithRelations[];
  days?: number;
}): ProfitTrendPoint[] {
  const days = input.days ?? 30;
  const startDate = addDays(input.today, -(days - 1));
  const dates = buildDateRange(input.today, days);
  const profitByDate = new Map<string, number>(
    dates.map((date) => [date, 0])
  );

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10);
    if (!saleDate || saleDate < startDate || saleDate > input.today) continue;
    const profit = calculateCarProfit(
      car,
      input.expensesByCar.get(car.id) ?? 0
    ).netProfit;
    profitByDate.set(saleDate, (profitByDate.get(saleDate) ?? 0) + profit);
  }

  for (const order of input.detailingOrders) {
    if (order.status !== "delivered") continue;
    const date = deliveryDate(order);
    if (!date || date < startDate || date > input.today) continue;
    const orderNet = order.final_price - resolveOrderCommissionTotal(order);
    profitByDate.set(date, (profitByDate.get(date) ?? 0) + orderNet);
  }

  for (const row of input.detailingExpenses) {
    const date = row.expense_date?.slice(0, 10);
    if (!date || date < startDate || date > input.today) continue;
    profitByDate.set(
      date,
      (profitByDate.get(date) ?? 0) - Number(row.amount ?? 0)
    );
  }

  for (const task of input.documentTasks) {
    const completedAt = task.completed_at?.slice(0, 10);
    if (!completedAt || completedAt < startDate || completedAt > input.today) {
      continue;
    }
    profitByDate.set(
      completedAt,
      (profitByDate.get(completedAt) ?? 0) + computeDocumentTaskProfit(task)
    );
  }

  return dates.map((date) => ({
    date,
    profit: roundMoney(profitByDate.get(date) ?? 0),
  }));
}

export function buildProfitDirectionBars(input: {
  today: string;
  cars: Car[];
  expensesByCar: Map<number, number>;
  detailingNet: number;
  documentTasks: DocumentTaskWithRelations[];
}): ProfitDirectionBar[] {
  const bounds = getDashboardPeriodBounds("month", input.today);
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
    const completedAt = task.completed_at?.slice(0, 10);
    if (!completedAt || completedAt < bounds.start! || completedAt > bounds.end!) {
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
