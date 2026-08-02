import {
  calculateCarProfit,
  isCarSold,
  shouldCountStatsProfit,
} from "@/lib/cars/business-rules";
import { isDateWithinPeriod, type DashboardPeriodBounds } from "@/lib/dashboard/period";
import type { ProfitDirectionBar } from "@/lib/dashboard/owner-chart-metrics";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export type FinanceTopSourceRow = {
  id: string;
  name: string;
  direction: "cars" | "detailing";
  amount: number;
};

export type FinanceExpenseBreakdownRow = {
  id: string;
  source: "vehicle" | "detailing";
  category: string;
  amount: number;
  sharePercent: number;
};

export type FinanceDirectionSummary = {
  id: "cars" | "detailing" | "documents";
  labelKey: "directionCars" | "directionDetailing" | "directionDocuments";
  profit: number;
};

export function buildTopProfitSources(input: {
  cars: Car[];
  expensesByCar: Map<number, number>;
  bounds: DashboardPeriodBounds;
  detailingOrders: DetailingOrderWithServices[];
  limit?: number;
}): FinanceTopSourceRow[] {
  const limit = input.limit ?? 5;
  const rows: FinanceTopSourceRow[] = [];

  for (const car of input.cars) {
    if (!isCarSold(car) || !shouldCountStatsProfit(car)) continue;
    const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10) ?? null;
    if (!isDateWithinPeriod(saleDate, input.bounds)) continue;

    const profit = calculateCarProfit(
      car,
      input.expensesByCar.get(car.id) ?? 0
    ).netProfit;

    if (profit <= 0) continue;

    rows.push({
      id: `car-${car.id}`,
      name: `${car.brand} ${car.model}`.trim(),
      direction: "cars",
      amount: roundMoney(profit),
    });
  }

  const serviceProfit = new Map<string, number>();
  for (const order of input.detailingOrders) {
    if (order.status !== "delivered") continue;
    const completedAt = (order.actual_completion_at ?? order.updated_at)?.slice(0, 10);
    if (!isDateWithinPeriod(completedAt, input.bounds)) continue;

    for (const service of order.services) {
      const profit = roundMoney(
        service.total_price - Number(service.commission_amount ?? 0)
      );
      if (profit <= 0) continue;
      const key = service.service_name_snapshot.trim() || "—";
      serviceProfit.set(key, roundMoney((serviceProfit.get(key) ?? 0) + profit));
    }
  }

  for (const [name, amount] of serviceProfit.entries()) {
    rows.push({
      id: `detailing-${name}`,
      name,
      direction: "detailing",
      amount,
    });
  }

  return rows.sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export function buildExpenseBreakdown(input: {
  vehicleExpenses: { category: string; amount: number }[];
  detailingExpenses: { category: string; amount: number }[];
  limit?: number;
}): FinanceExpenseBreakdownRow[] {
  const limit = input.limit ?? 5;
  const totals = new Map<string, FinanceExpenseBreakdownRow>();

  for (const expense of input.vehicleExpenses) {
    const key = `vehicle:${expense.category}`;
    const existing = totals.get(key);
    if (existing) {
      existing.amount = roundMoney(existing.amount + expense.amount);
    } else {
      totals.set(key, {
        id: key,
        source: "vehicle",
        category: expense.category,
        amount: roundMoney(expense.amount),
        sharePercent: 0,
      });
    }
  }

  for (const expense of input.detailingExpenses) {
    const key = `detailing:${expense.category}`;
    const existing = totals.get(key);
    if (existing) {
      existing.amount = roundMoney(existing.amount + expense.amount);
    } else {
      totals.set(key, {
        id: key,
        source: "detailing",
        category: expense.category,
        amount: roundMoney(expense.amount),
        sharePercent: 0,
      });
    }
  }

  const rows = Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  const grandTotal = rows.reduce((sum, row) => sum + row.amount, 0);

  return rows.slice(0, limit).map((row) => ({
    ...row,
    sharePercent:
      grandTotal > 0 ? Math.round((row.amount / grandTotal) * 1000) / 10 : 0,
  }));
}

export function simplifyFinanceDirectionBars(input: {
  bars: ProfitDirectionBar[];
  documentsProfit: number | null;
}): FinanceDirectionSummary[] {
  let carsProfit = 0;
  let detailingProfit = 0;

  for (const bar of input.bars) {
    if (bar.id === "owned_cars" || bar.id === "commission_cars") {
      carsProfit += bar.profit;
    }
    if (bar.id === "detailing") {
      detailingProfit = bar.profit;
    }
  }

  const summaries: FinanceDirectionSummary[] = [];

  if (carsProfit !== 0) {
    summaries.push({
      id: "cars",
      labelKey: "directionCars",
      profit: roundMoney(carsProfit),
    });
  }

  if (detailingProfit !== 0) {
    summaries.push({
      id: "detailing",
      labelKey: "directionDetailing",
      profit: roundMoney(detailingProfit),
    });
  }

  if (input.documentsProfit != null && input.documentsProfit !== 0) {
    summaries.push({
      id: "documents",
      labelKey: "directionDocuments",
      profit: roundMoney(input.documentsProfit),
    });
  }

  return summaries;
}
