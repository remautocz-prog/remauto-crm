import {
  resolveOrderCommissionTotal,
  sumDeliveredOrderCommissions,
} from "@/lib/detailing/finance-aggregation";
import { roundMoney } from "@/lib/detailing/pricing";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

export type DetailingFinanceSummary = {
  orderCount: number;
  revenue: number;
  commissions: number;
  expenses: number;
  netResult: number;
};

export function computeDetailingFinanceSummary(
  orders: DetailingOrderWithServices[],
  expenseTotal: number
): DetailingFinanceSummary {
  const delivered = orders.filter((order) => order.status === "delivered");
  const revenue = roundMoney(
    delivered.reduce((sum, order) => sum + order.final_price, 0)
  );
  const commissions = sumDeliveredOrderCommissions(delivered);
  const expenses = roundMoney(expenseTotal);

  return {
    orderCount: delivered.length,
    revenue,
    commissions,
    expenses,
    netResult: roundMoney(revenue - commissions - expenses),
  };
}

function deliveryDate(order: DetailingOrderWithServices) {
  const value = order.actual_completion_at ?? order.updated_at;
  return value ? value.slice(0, 10) : null;
}

export function buildDetailingDailyNetByDate(input: {
  orders: DetailingOrderWithServices[];
  expenses: { amount: number | null; expense_date: string | null }[];
  startDate: string;
  endDate: string;
}): Map<string, number> {
  const netByDate = new Map<string, number>();

  for (const order of input.orders) {
    if (order.status !== "delivered") continue;
    const date = deliveryDate(order);
    if (!date || date < input.startDate || date > input.endDate) continue;
    const orderNet =
      order.final_price - resolveOrderCommissionTotal(order);
    netByDate.set(date, (netByDate.get(date) ?? 0) + orderNet);
  }

  for (const expense of input.expenses) {
    const date = expense.expense_date?.slice(0, 10);
    if (!date || date < input.startDate || date > input.endDate) continue;
    netByDate.set(date, (netByDate.get(date) ?? 0) - Number(expense.amount ?? 0));
  }

  for (const [date, value] of netByDate.entries()) {
    netByDate.set(date, roundMoney(value));
  }

  return netByDate;
}
