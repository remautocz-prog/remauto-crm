import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DetailingExpensesList } from "@/components/detailing/expenses-list";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import {
  getDetailingExpenseMonthSummary,
  getDetailingExpenses,
} from "@/lib/queries/detailing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("expensesTitle") };
}

export default async function DetailingExpensesPage() {
  const result = await runDetailingPageSafe(
    () => Promise.all([getDetailingExpenses(), getDetailingExpenseMonthSummary()]),
    [[], { total: 0, count: 0, largestCategory: null, largestCategoryAmount: 0 }] as const
  );

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const [expenses, monthSummary] = result.data;

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={result.warnings} />
      <DetailingExpensesList expenses={expenses} monthSummary={monthSummary} />
    </div>
  );
}
