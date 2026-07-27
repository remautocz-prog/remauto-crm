import type { DocumentPaymentStatus } from "@/lib/constants/documents";
import type { DocumentTask } from "@/lib/types/documents";
import { resolveTaskPricing } from "@/lib/documents/task-services";

export function derivePaymentStatus(
  paidAmount: number,
  servicePrice: number | null | undefined
): DocumentPaymentStatus {
  const price = Number(servicePrice ?? 0);
  const paid = Number(paidAmount ?? 0);
  if (paid <= 0) return "unpaid";
  if (price > 0 && paid < price) return "partially_paid";
  if (price > 0 && paid >= price) return "paid";
  return paid > 0 ? "partially_paid" : "unpaid";
}

export function calculateOutstandingBalance(
  servicePrice: number | null | undefined,
  paidAmount: number
) {
  return Math.max(Number(servicePrice ?? 0) - Number(paidAmount ?? 0), 0);
}

export function canMarkPaidInFull(servicePrice: number | null | undefined): boolean {
  return servicePrice != null && !Number.isNaN(Number(servicePrice)) && Number(servicePrice) >= 0;
}

export function inferPaidInFull(
  task: Pick<DocumentTask, "service_price" | "cost_price" | "paid_amount" | "payment_status"> & {
    services?: DocumentTask["services"];
  }
): boolean {
  const { servicePrice } = resolveTaskPricing(task);
  if (!canMarkPaidInFull(servicePrice)) return false;
  const paidAmount = Number(task.paid_amount ?? 0);
  return paidAmount >= servicePrice && task.payment_status === "paid";
}

export function resolveFormPaidAmount(input: {
  servicePrice: number | null | undefined;
  paidAmount: number;
  paidInFull?: boolean;
}): number {
  if (input.paidInFull && canMarkPaidInFull(input.servicePrice)) {
    return Number(input.servicePrice);
  }
  return Number(input.paidAmount ?? 0);
}

export function buildPaymentFields(input: {
  servicePrice: number | null | undefined;
  paidAmount: number;
  paidInFull?: boolean;
  paymentMethod?: string | null;
  existingPaidAt?: string | null;
}) {
  const paidAmount = resolveFormPaidAmount(input);
  const paymentStatus = derivePaymentStatus(paidAmount, input.servicePrice);
  let paidAt = input.existingPaidAt ?? null;

  if (paymentStatus === "paid") {
    paidAt = paidAt ?? new Date().toISOString();
  } else {
    paidAt = null;
  }

  return {
    paid_amount: paidAmount,
    payment_status: paymentStatus,
    paid_at: paidAt,
    payment_method:
      paymentStatus === "unpaid"
        ? null
        : input.paymentMethod?.trim()
          ? input.paymentMethod.trim()
          : null,
  };
}
