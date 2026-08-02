import {
  calculateCarProfit,
  isCarSold,
  shouldCountStatsProfit,
} from "@/lib/cars/business-rules";
import { CAR_STATUS_IN_STOCK } from "@/lib/constants/status";
import {
  getDashboardPeriodBounds,
  isDateWithinPeriod,
  type DashboardPeriodBounds,
} from "@/lib/dashboard/period";
import type { Car } from "@/lib/types/cars";

export type CarsFinanceSummary = {
  realizedProfit: number;
  projectedProfit: number;
  soldCount: number;
  activeCount: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildExpensesByCar(
  expenses: { car_id: number | string; amount: number | string }[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const expense of expenses) {
    const carId = Number(expense.car_id);
    map.set(carId, (map.get(carId) ?? 0) + Number(expense.amount));
  }
  return map;
}

function isActiveInventoryCar(car: Car) {
  if (isCarSold(car)) return false;
  return [
    CAR_STATUS_IN_STOCK,
    "reserved",
    "in_transit",
    "in_progress",
    "new",
  ].includes(car.status);
}

export function computeCarsFinanceSummary(input: {
  cars: Car[];
  expensesByCar: Map<number, number>;
  bounds: DashboardPeriodBounds;
}): CarsFinanceSummary {
  let realizedProfit = 0;
  let projectedProfit = 0;
  let soldCount = 0;
  let activeCount = 0;

  for (const car of input.cars) {
    const totalExpenses = input.expensesByCar.get(car.id) ?? 0;
    const profit = calculateCarProfit(car, totalExpenses).netProfit;

    if (isCarSold(car) && shouldCountStatsProfit(car)) {
      const saleDate = (car.sale_date ?? car.updated_at)?.slice(0, 10) ?? null;
      if (isDateWithinPeriod(saleDate, input.bounds)) {
        realizedProfit += profit;
        soldCount += 1;
      }
      continue;
    }

    if (isActiveInventoryCar(car)) {
      projectedProfit += profit;
      activeCount += 1;
    }
  }

  return {
    realizedProfit: roundMoney(realizedProfit),
    projectedProfit: roundMoney(projectedProfit),
    soldCount,
    activeCount,
  };
}

export function sumSoldCarsProfitInPeriod(input: {
  cars: Car[];
  expensesByCar: Map<number, number>;
  period: "month" | "week" | "year" | "today" | "all";
  today: string;
}) {
  const bounds = getDashboardPeriodBounds(input.period, input.today);
  return computeCarsFinanceSummary({
    cars: input.cars,
    expensesByCar: input.expensesByCar,
    bounds,
  }).realizedProfit;
}
