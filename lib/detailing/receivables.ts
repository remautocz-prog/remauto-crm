import {
  calculateRemainingAmount,
  roundMoney,
} from "@/lib/detailing/pricing";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

export type DetailingReceivablesSummary = {
  unpaidOrderCount: number;
  outstandingAmount: number;
};

export function getDetailingOutstandingBalance(
  order: Pick<DetailingOrderWithServices, "final_price" | "paid_amount">
): number {
  return calculateRemainingAmount(order.final_price, order.paid_amount);
}

export function isDetailingReceivableOrder(
  order: Pick<
    DetailingOrderWithServices,
    "archived_at" | "status" | "final_price" | "paid_amount"
  >
): boolean {
  if (order.archived_at) return false;
  if (order.status === "cancelled") return false;
  if (order.final_price <= 0) return false;
  return getDetailingOutstandingBalance(order) > 0;
}

export function isDetailingPartiallyPaidReceivable(
  order: Pick<
    DetailingOrderWithServices,
    "final_price" | "paid_amount" | "archived_at" | "status"
  >
): boolean {
  if (!isDetailingReceivableOrder(order)) return false;
  return order.paid_amount > 0;
}

export function summarizeDetailingReceivables(
  orders: DetailingOrderWithServices[]
): DetailingReceivablesSummary {
  let unpaidOrderCount = 0;
  let outstandingAmount = 0;

  for (const order of orders) {
    if (!isDetailingReceivableOrder(order)) continue;
    unpaidOrderCount += 1;
    outstandingAmount += getDetailingOutstandingBalance(order);
  }

  return {
    unpaidOrderCount,
    outstandingAmount: roundMoney(outstandingAmount),
  };
}
