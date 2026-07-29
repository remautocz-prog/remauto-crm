import type { DealPaymentPayer } from "@/lib/constants/deals";
import type { DealPaymentCalculation } from "@/lib/types/deals";

export function calculateDealPayment(
  vehicleAValue: number | null | undefined,
  vehicleBValue: number | null | undefined
): DealPaymentCalculation {
  const a = Number(vehicleAValue ?? 0);
  const b = Number(vehicleBValue ?? 0);
  const difference = roundMoney(a - b);

  if (difference === 0) {
    return {
      difference: 0,
      suggestedPayer: "none",
      suggestedAdditionalPayment: 0,
    };
  }

  if (difference > 0) {
    return {
      difference,
      suggestedPayer: "customer",
      suggestedAdditionalPayment: difference,
    };
  }

  return {
    difference,
    suggestedPayer: "remauto",
    suggestedAdditionalPayment: roundMoney(Math.abs(difference)),
  };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseMoneyInput(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", "."));
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return roundMoney(parsed);
}

export function normalizePayerForPayment(
  payer: DealPaymentPayer | null | undefined,
  additionalPayment: number | null | undefined
): DealPaymentPayer {
  if (!additionalPayment || additionalPayment === 0) return "none";
  return payer ?? "none";
}

export function defaultPaymentStatus(
  payer: DealPaymentPayer,
  additionalPayment: number | null | undefined
) {
  if (payer === "none" || !additionalPayment || additionalPayment === 0) {
    return "not_applicable" as const;
  }
  return "unpaid" as const;
}
