import type { BusinessModel, CommissionType } from "@/lib/constants/business-model";
import { BUSINESS_MODEL_VALUES, COMMISSION_TYPE_VALUES } from "@/lib/constants/business-model";

export function translateBusinessModel(
  t: (key: BusinessModel) => string,
  model: string
) {
  if (BUSINESS_MODEL_VALUES.includes(model as BusinessModel)) {
    return t(model as BusinessModel);
  }
  return model;
}

export function translateBusinessModelShort(
  t: (key: BusinessModel) => string,
  model: string
) {
  if (BUSINESS_MODEL_VALUES.includes(model as BusinessModel)) {
    return t(model as BusinessModel);
  }
  return model;
}

export function translateCommissionType(
  t: (key: CommissionType) => string,
  type: string | null | undefined
) {
  if (type && COMMISSION_TYPE_VALUES.includes(type as CommissionType)) {
    return t(type as CommissionType);
  }
  return type ?? "";
}
