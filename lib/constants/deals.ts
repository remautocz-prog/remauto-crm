export const DEAL_TYPES = [
  "vehicle_exchange_with_additional_payment",
  "vehicle_sale",
  "vehicle_purchase",
  "commission_sale",
  "brokerage",
  "consignment",
  "custom",
] as const;

export type DealType = (typeof DEAL_TYPES)[number];

export const IMPLEMENTED_DEAL_TYPES: DealType[] = [
  "vehicle_exchange_with_additional_payment",
];

export const DEAL_STATUSES = [
  "draft",
  "prepared",
  "signed",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_VEHICLE_SOURCES = ["crm", "external"] as const;

export type DealVehicleSource = (typeof DEAL_VEHICLE_SOURCES)[number];

export const DEAL_PAYMENT_PAYERS = ["remauto", "customer", "none"] as const;

export type DealPaymentPayer = (typeof DEAL_PAYMENT_PAYERS)[number];

export const DEAL_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "financing",
  "other",
] as const;

export type DealPaymentMethod = (typeof DEAL_PAYMENT_METHODS)[number];

export const DEAL_PAYMENT_STATUSES = [
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "not_applicable",
] as const;

export type DealPaymentStatus = (typeof DEAL_PAYMENT_STATUSES)[number];

export const DEAL_CURRENCIES = ["CZK", "EUR"] as const;

export type DealCurrency = (typeof DEAL_CURRENCIES)[number];

export const DEAL_HANDOVER_SIDES = ["vehicle_a", "vehicle_b"] as const;

export type DealHandoverSide = (typeof DEAL_HANDOVER_SIDES)[number];

export const DEAL_NUMBER_PREFIX: Record<DealType, string> = {
  vehicle_exchange_with_additional_payment: "SM",
  vehicle_sale: "SP",
  vehicle_purchase: "NK",
  commission_sale: "KM",
  brokerage: "ZS",
  consignment: "KS",
  custom: "DL",
};

export const SIGNED_DEAL_STATUSES: DealStatus[] = [
  "signed",
  "in_progress",
  "completed",
];

export const EDITABLE_DEAL_STATUSES: DealStatus[] = ["draft", "prepared"];
