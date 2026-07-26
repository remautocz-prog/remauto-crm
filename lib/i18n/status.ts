const STATUS_KEYS = [
  "in_stock",
  "reserved",
  "sold",
  "new",
  "in_progress",
  "completed",
  "cancelled",
  "in_transit",
  "open",
  "pending",
  "active",
  "archived",
] as const;

const EXPENSE_CATEGORY_KEYS = [
  "purchase",
  "logistics",
  "repair",
  "detailing",
  "documents",
  "other",
] as const;

type StatusKey = (typeof STATUS_KEYS)[number];
type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number];

export function translateStatus(
  t: (key: StatusKey) => string,
  status: string
) {
  if (STATUS_KEYS.includes(status as StatusKey)) {
    return t(status as StatusKey);
  }
  return status;
}

export function translateExpenseCategory(
  t: (key: ExpenseCategoryKey) => string,
  category: string
) {
  if (EXPENSE_CATEGORY_KEYS.includes(category as ExpenseCategoryKey)) {
    return t(category as ExpenseCategoryKey);
  }
  return category;
}

export function translateFinanceType(
  tStatus: (key: StatusKey) => string,
  tFinance: (key: "income" | "expense") => string,
  type: string
) {
  if (type === "income") return tFinance("income");
  if (type === "expense") return tFinance("expense");
  return translateStatus(tStatus, type);
}
