import type { Car } from "@/lib/types/cars";
import {
  calculateCarProfit,
  calculateGrossCommission,
  calculateRemAutoRevenue,
  getListRowDisplay,
  resolveSaleBasePrice,
  type CarFinanceInput,
  type CarProfitResult,
  type ListAmount,
  type ListRowDisplay,
} from "@/lib/cars/business-rules";

export {
  calculateCarProfit,
  calculateGrossCommission,
  calculateRemAutoRevenue,
  getListRowDisplay,
  resolveSaleBasePrice,
  type CarFinanceInput,
  type CarProfitResult,
  type ListAmount,
  type ListRowDisplay,
};

/** @deprecated Use getListRowDisplay instead */
export function getListPrimaryAmount(car: Car) {
  const display = getListRowDisplay(car);
  if (display.primaryLabelKey === "purchasePrice") {
    return { kind: "purchase" as const, amount: display.primary.amount };
  }
  return {
    kind: "commission" as const,
    amount: display.secondary.amount,
    isEstimate: display.secondary.isEstimate,
  };
}

/** @deprecated Use getListRowDisplay instead */
export function getListSaleAmount(car: Car) {
  const display = getListRowDisplay(car);
  return {
    amount: display.secondary.amount,
    isEstimate: display.secondary.isEstimate,
  };
}
