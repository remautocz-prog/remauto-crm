import { getTranslations } from "next-intl/server";
import { translateStatus } from "@/lib/i18n/status";

export async function getStatusLabel(status: string) {
  const t = await getTranslations("status");
  return translateStatus(t, status);
}

export async function getExpenseCategoryLabel(category: string) {
  const t = await getTranslations("expenseCategories");
  const keys = [
    "purchase",
    "logistics",
    "repair",
    "detailing",
    "documents",
    "third_party_commission",
    "other",
  ] as const;

  if (keys.includes(category as (typeof keys)[number])) {
    return t(category as (typeof keys)[number]);
  }

  return category;
}

export async function getFinanceTypeLabel(type: string) {
  const tFinance = await getTranslations("finance");
  if (type === "income") return tFinance("income");
  if (type === "expense") return tFinance("expense");
  return getStatusLabel(type);
}
