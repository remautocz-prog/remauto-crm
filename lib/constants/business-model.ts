export const BUSINESS_MODEL_VALUES = [
  "owned",
  "commission",
  "client_order",
] as const;

export const COMMISSION_TYPE_VALUES = ["fixed", "percentage"] as const;

export type BusinessModel = (typeof BUSINESS_MODEL_VALUES)[number];
export type CommissionType = (typeof COMMISSION_TYPE_VALUES)[number];

export const DEFAULT_BUSINESS_MODEL: BusinessModel = "owned";
