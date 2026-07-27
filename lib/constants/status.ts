export { OPEN_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";

export const CAR_STATUS_IN_STOCK = "in_stock";
export const CAR_STATUS_SOLD = "sold";

export const ACTIVE_DETAILING_STATUSES = [
  "pending",
  "in_progress",
  "active",
] as const;

export const FINANCE_TYPE_INCOME = "income";
export const FINANCE_TYPE_EXPENSE = "expense";
