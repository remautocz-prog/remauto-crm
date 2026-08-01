export const DETAILING_ORDER_STATUSES = [
  "scheduled",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type DetailingOrderStatus = (typeof DETAILING_ORDER_STATUSES)[number];

export const DETAILING_PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "other",
] as const;

export type DetailingPaymentMethod = (typeof DETAILING_PAYMENT_METHODS)[number];

export const DETAILING_PAYMENT_STATUSES = [
  "unpaid",
  "partially_paid",
  "paid",
] as const;

export type DetailingPaymentStatus = (typeof DETAILING_PAYMENT_STATUSES)[number];

export const DETAILING_VEHICLE_SIZES = ["standard", "suv", "xxl"] as const;

export type DetailingVehicleSize = (typeof DETAILING_VEHICLE_SIZES)[number];

export const DETAILING_VEHICLE_SIZE_SURCHARGE_PERCENT: Record<
  DetailingVehicleSize,
  number
> = {
  standard: 0,
  suv: 15,
  xxl: 25,
};

export const DETAILING_SERVICE_CATEGORIES = [
  "exterior_program",
  "interior_program",
  "exterior_additional",
  "interior_additional",
  "combined_package",
  "other",
] as const;

export type DetailingServiceCategory = (typeof DETAILING_SERVICE_CATEGORIES)[number];

export const DETAILING_PRICE_TYPES = [
  "fixed",
  "from",
  "range",
  "per_item",
  "on_request",
  "custom",
] as const;

export type DetailingPriceType = (typeof DETAILING_PRICE_TYPES)[number];

export const DETAILING_EXPENSE_CATEGORIES = [
  "chemicals",
  "ppf_material",
  "consumables",
  "equipment",
  "tools",
  "rent",
  "utilities",
  "marketing",
  "other",
] as const;

export type DetailingExpenseCategory = (typeof DETAILING_EXPENSE_CATEGORIES)[number];

export const ACTIVE_DETAILING_ORDER_STATUSES: DetailingOrderStatus[] = [
  "scheduled",
  "in_progress",
  "ready",
];

export const DEFAULT_EMPLOYEE_COMMISSION_PERCENT = 35;

export const DETAILING_ORDER_NUMBER_PREFIX = "DT";
