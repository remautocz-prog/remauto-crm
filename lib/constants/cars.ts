export const CAR_STATUS_VALUES = [
  "in_stock",
  "sold",
  "reserved",
  "in_transit",
] as const;

export const EXPENSE_CATEGORY_VALUES = [
  "purchase",
  "logistics",
  "repair",
  "detailing",
  "documents",
  "other",
] as const;

export const CAR_SORT_VALUES = [
  "newest",
  "purchase_date",
  "price",
  "sale_date",
] as const;

export type CarStatusValue = (typeof CAR_STATUS_VALUES)[number];
export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORY_VALUES)[number];
export type CarSortValue = (typeof CAR_SORT_VALUES)[number];
