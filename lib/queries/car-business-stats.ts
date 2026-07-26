import { createClient } from "@/lib/supabase/server";
import {
  calculateCarProfit,
  isCarSold,
  shouldCountStatsProfit,
  shouldCountStatsRevenue,
} from "@/lib/cars/business-rules";
import { CAR_STATUS_IN_STOCK } from "@/lib/constants/status";
import type { BusinessModel } from "@/lib/constants/business-model";
import type { Car } from "@/lib/types/cars";

const ACTIVE_STATUSES = [
  CAR_STATUS_IN_STOCK,
  "reserved",
  "in_transit",
  "in_progress",
  "new",
];

export type ModelStats = {
  inStock: number;
  sold: number;
  active: number;
  completed: number;
  revenue: number;
  profit: number;
};

export type CarBusinessStats = {
  owned: ModelStats;
  commission: ModelStats;
  clientOrder: ModelStats;
  overallProfit: number;
};

function emptyModelStats(): ModelStats {
  return {
    inStock: 0,
    sold: 0,
    active: 0,
    completed: 0,
    revenue: 0,
    profit: 0,
  };
}

function isActive(car: Car) {
  return ACTIVE_STATUSES.includes(car.status);
}

export async function getCarBusinessStats(): Promise<CarBusinessStats> {
  const supabase = await createClient();

  const [carsResult, expensesResult] = await Promise.all([
    supabase.from("cars").select("*"),
    supabase.from("car_expenses").select("car_id, amount"),
  ]);

  if (carsResult.error) throw carsResult.error;
  if (expensesResult.error) throw expensesResult.error;

  const expensesByCar = new Map<number, number>();
  for (const expense of expensesResult.data ?? []) {
    const carId = Number(expense.car_id);
    expensesByCar.set(
      carId,
      (expensesByCar.get(carId) ?? 0) + Number(expense.amount)
    );
  }

  const stats: CarBusinessStats = {
    owned: emptyModelStats(),
    commission: emptyModelStats(),
    clientOrder: emptyModelStats(),
    overallProfit: 0,
  };

  for (const row of carsResult.data ?? []) {
    const car = row as Car;
    const model = (car.business_model ?? "owned") as BusinessModel;
    const totalExpenses = expensesByCar.get(car.id) ?? 0;
    const profitResult = calculateCarProfit(car, totalExpenses);
    const sold = isCarSold(car);
    const active = isActive(car);

    let bucket: ModelStats;
    if (model === "commission") {
      bucket = stats.commission;
    } else if (model === "client_order") {
      bucket = stats.clientOrder;
    } else {
      bucket = stats.owned;
    }

    if (model === "owned") {
      if (car.status === CAR_STATUS_IN_STOCK) bucket.inStock += 1;
      if (sold) bucket.sold += 1;
      if (shouldCountStatsRevenue(car)) {
        bucket.revenue += profitResult.revenue;
      }
      if (shouldCountStatsProfit(car)) {
        bucket.profit += profitResult.netProfit;
        stats.overallProfit += profitResult.netProfit;
      }
    } else if (model === "commission") {
      if (active && !sold) bucket.active += 1;
      if (sold) bucket.sold += 1;
      if (shouldCountStatsRevenue(car)) {
        bucket.revenue += profitResult.revenue;
      }
      if (shouldCountStatsProfit(car)) {
        bucket.profit += profitResult.netProfit;
        stats.overallProfit += profitResult.netProfit;
      }
    } else {
      if (active && !sold) bucket.active += 1;
      if (sold) bucket.completed += 1;
      if (shouldCountStatsRevenue(car)) {
        bucket.revenue += profitResult.revenue;
      }
      if (shouldCountStatsProfit(car)) {
        bucket.profit += profitResult.netProfit;
        stats.overallProfit += profitResult.netProfit;
      }
    }
  }

  return stats;
}
