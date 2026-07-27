import { calculateRemAutoRevenue, isCarSold } from "@/lib/cars/business-rules";
import type { Car } from "@/lib/types/cars";
import type { FinanceTransaction } from "@/lib/types/database";

export type ClientFinanceSummary = {
  remautoRevenue: number;
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  soldCarsCount: number;
};

export function calculateClientFinanceSummary(
  cars: Car[],
  transactions: FinanceTransaction[]
): ClientFinanceSummary {
  let remautoRevenue = 0;
  let soldCarsCount = 0;

  for (const car of cars) {
    if (!isCarSold(car)) continue;
    soldCarsCount += 1;
    remautoRevenue += calculateRemAutoRevenue(car);
  }

  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income") incomeTotal += amount;
    if (tx.type === "expense") expenseTotal += amount;
  }

  return {
    remautoRevenue,
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    soldCarsCount,
  };
}
