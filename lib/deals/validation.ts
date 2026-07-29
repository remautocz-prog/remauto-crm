import type { DealStatus } from "@/lib/constants/deals";
import type { DealFormInput } from "@/lib/types/deals";
import { IMPLEMENTED_DEAL_TYPES } from "@/lib/constants/deals";
import { validateVinWarning } from "@/lib/deals/vin";
import { parseMoneyInput } from "@/lib/deals/finance";

export type DealValidationIssue = {
  field: string;
  messageKey: string;
};

export function collectDealValidationIssues(
  input: DealFormInput,
  options?: { phase?: "prepare" | "sign" | "complete" }
): DealValidationIssue[] {
  const issues: DealValidationIssue[] = [];
  const phase = options?.phase ?? "prepare";

  if (!IMPLEMENTED_DEAL_TYPES.includes(input.deal_type)) {
    issues.push({ field: "deal_type", messageKey: "unsupportedDealType" });
  }

  if (phase === "prepare" || phase === "sign" || phase === "complete") {
    if (!input.client_id) {
      issues.push({ field: "client_id", messageKey: "clientRequired" });
    }

    if (input.vehicle_a_source === "crm" && !input.vehicle_a_id) {
      issues.push({ field: "vehicle_a_id", messageKey: "vehicleARequired" });
    }
    if (input.vehicle_a_source === "external") {
      if (!input.vehicle_a_external?.make?.trim()) {
        issues.push({ field: "vehicle_a_external.make", messageKey: "vehicleARequired" });
      }
    }

    if (input.vehicle_b_source === "crm" && !input.vehicle_b_id) {
      issues.push({ field: "vehicle_b_id", messageKey: "vehicleBRequired" });
    }
    if (input.vehicle_b_source === "external") {
      if (!input.vehicle_b_external?.make?.trim()) {
        issues.push({ field: "vehicle_b_external.make", messageKey: "vehicleBRequired" });
      }
    }

    if (parseMoneyInput(input.vehicle_a_value) == null) {
      issues.push({ field: "vehicle_a_value", messageKey: "vehicleAValueRequired" });
    }
    if (parseMoneyInput(input.vehicle_b_value) == null) {
      issues.push({ field: "vehicle_b_value", messageKey: "vehicleBValueRequired" });
    }
    if (!input.currency) {
      issues.push({ field: "currency", messageKey: "currencyRequired" });
    }
    if (
      input.additional_payment_payer == null &&
      (input.additional_payment ?? 0) > 0
    ) {
      issues.push({ field: "additional_payment_payer", messageKey: "payerRequired" });
    }
  }

  if (phase === "sign" || phase === "complete") {
    if (!input.signing_date) {
      issues.push({ field: "signing_date", messageKey: "signingDateRequired" });
    }
    if (!input.signing_place?.trim()) {
      issues.push({ field: "signing_place", messageKey: "signingPlaceRequired" });
    }
    if (input.additional_payment_payer !== "none" && (input.additional_payment ?? 0) > 0) {
      if (!input.payment_method) {
        issues.push({ field: "payment_method", messageKey: "paymentMethodRequired" });
      }
    }
  }

  if (phase === "complete") {
    if (!input.handover_date) {
      issues.push({ field: "handover_date", messageKey: "handoverDateRequired" });
    }
    if (!input.handover_place?.trim()) {
      issues.push({ field: "handover_place", messageKey: "handoverPlaceRequired" });
    }
    if (
      input.payment_status !== "paid" &&
      input.payment_status !== "not_applicable"
    ) {
      issues.push({ field: "payment_status", messageKey: "paymentMustBeSettled" });
    }
  }

  const vinA =
    input.vehicle_a_source === "external"
      ? input.vehicle_a_external?.vin
      : undefined;
  const vinB =
    input.vehicle_b_source === "external"
      ? input.vehicle_b_external?.vin
      : undefined;

  if (validateVinWarning(vinA)) {
    issues.push({ field: "vehicle_a_external.vin", messageKey: validateVinWarning(vinA)! });
  }
  if (validateVinWarning(vinB)) {
    issues.push({ field: "vehicle_b_external.vin", messageKey: validateVinWarning(vinB)! });
  }

  return issues;
}

export function canTransitionStatus(from: DealStatus, to: DealStatus) {
  if (from === to) return true;
  if (from === "archived" || from === "cancelled") return false;

  const allowed: Record<DealStatus, DealStatus[]> = {
    draft: ["prepared", "cancelled", "archived"],
    prepared: ["draft", "signed", "cancelled", "archived"],
    signed: ["in_progress", "cancelled", "archived"],
    in_progress: ["completed", "cancelled", "archived"],
    completed: ["archived"],
    cancelled: ["archived"],
    archived: [],
  };

  return allowed[from]?.includes(to) ?? false;
}
