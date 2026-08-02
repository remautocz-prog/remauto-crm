import { CAR_STATUS_SOLD } from "@/lib/constants/status";
import type { Car, CarExpense } from "@/lib/types/cars";
import type { CarStatusValue } from "@/lib/constants/cars";
export function getCarStatusRowStripe(status: string) {
  const stripes: Record<CarStatusValue, string> = {
    in_stock: "border-l-sky-500",
    in_transit: "border-l-sky-400",
    reserved: "border-l-amber-500",
    sold: "border-l-emerald-500",
  };
  return stripes[status as CarStatusValue] ?? "border-l-zinc-600";
}

export function getProfitToneClass(
  amount: number | null | undefined,
  isEstimate?: boolean
) {
  if (amount == null || Number.isNaN(amount)) return "text-zinc-500";
  if (amount > 0) return "text-emerald-400";
  if (amount < 0) return "text-red-400";
  if (isEstimate) return "text-zinc-400";
  return "text-zinc-500";
}

export function getProfitLabelKey(
  car: Pick<Car, "status">
): "projectedProfit" | "finalProfit" {
  return car.status === CAR_STATUS_SOLD ? "finalProfit" : "projectedProfit";
}

export function resolveActualSalePrice(car: Car) {
  if (
    car.actual_sale_price == null ||
    Number.isNaN(car.actual_sale_price) ||
    Number(car.actual_sale_price) <= 0
  ) {
    return null;
  }
  return Number(car.actual_sale_price);
}

export type CarExpenseSummary = {
  total: number;
  largestCategory: string | null;
  largestCategoryAmount: number;
  latestExpense: CarExpense | null;
  thirdPartyCommissionTotal: number;
};

export function summarizeCarExpenses(
  expenses: CarExpense[],
  translateCategory: (category: string) => string
): CarExpenseSummary {
  let total = 0;
  let thirdPartyCommissionTotal = 0;
  const byCategory = new Map<string, number>();

  for (const expense of expenses) {
    const amount = Number(expense.amount ?? 0);
    total += amount;
    if (expense.category === "third_party_commission") {
      thirdPartyCommissionTotal += amount;
    }
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + amount
    );
  }

  let largestCategory: string | null = null;
  let largestCategoryAmount = 0;
  for (const [category, amount] of byCategory.entries()) {
    if (amount > largestCategoryAmount) {
      largestCategory = translateCategory(category);
      largestCategoryAmount = amount;
    }
  }

  const latestExpense =
    expenses.length > 0
      ? [...expenses].sort(
          (a, b) =>
            new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
        )[0]
      : null;

  return {
    total,
    largestCategory,
    largestCategoryAmount,
    latestExpense,
    thirdPartyCommissionTotal,
  };
}
