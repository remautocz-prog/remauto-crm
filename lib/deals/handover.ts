import type { DealHandoverDetail } from "@/lib/types/deals";
import type { DealHandoverSideInput } from "@/lib/types/deals";
import type { HandoverVehicleSide } from "@/lib/constants/handover";

export type HandoverValidationIssue = {
  field: string;
  messageKey: string;
};

export function isHandoverSideComplete(detail: DealHandoverDetail | null | undefined) {
  if (!detail?.handover_datetime) return false;
  if (detail.mileage != null && detail.mileage < 0) return false;
  if (detail.key_count != null && detail.key_count < 0) return false;
  return true;
}

export function areBothHandoverSidesComplete(details: DealHandoverDetail[] | undefined) {
  const sideA = details?.find((item) => item.vehicle_side === "vehicle_a");
  const sideB = details?.find((item) => item.vehicle_side === "vehicle_b");
  return isHandoverSideComplete(sideA) && isHandoverSideComplete(sideB);
}

export function collectHandoverInputValidationIssues(
  input: DealHandoverSideInput
): HandoverValidationIssue[] {
  const issues: HandoverValidationIssue[] = [];

  if (input.mileage != null && input.mileage < 0) {
    issues.push({ field: "mileage", messageKey: "mileageInvalid" });
  }
  if (input.key_count != null && input.key_count < 0) {
    issues.push({ field: "key_count", messageKey: "keyCountInvalid" });
  }

  return issues;
}

export function normalizeHandoverSideInput(input: DealHandoverSideInput) {
  return {
    deal_id: input.deal_id,
    vehicle_side: input.vehicle_side,
    handover_datetime: input.handover_datetime?.trim() || null,
    mileage: input.mileage != null && input.mileage >= 0 ? Math.trunc(input.mileage) : null,
    fuel_level: input.fuel_level?.trim() || null,
    key_count:
      input.key_count != null && input.key_count >= 0 ? Math.trunc(input.key_count) : null,
    documents: Array.isArray(input.documents)
      ? input.documents.filter((value) => typeof value === "string" && value.trim())
      : [],
    accessories: input.accessories?.trim() || null,
    visible_damage: input.visible_damage?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export function getHandoverDetailForSide(
  details: DealHandoverDetail[] | undefined,
  side: HandoverVehicleSide
) {
  return details?.find((item) => item.vehicle_side === side) ?? null;
}
