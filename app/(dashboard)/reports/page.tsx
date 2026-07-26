import type { Metadata } from "next";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import {
  FINANCE_TYPE_EXPENSE,
  FINANCE_TYPE_INCOME,
} from "@/lib/constants/status";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const [stats, clientsResult, financeResult] = await Promise.all([
    getDashboardStats(),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("finance_transactions").select("type, amount"),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (financeResult.error) throw financeResult.error;

  const income =
    financeResult.data
      ?.filter((t) => t.type === FINANCE_TYPE_INCOME)
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const expense =
    financeResult.data
      ?.filter((t) => t.type === FINANCE_TYPE_EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Business summaries from your Supabase database."
      />
      <DataTable
        title="Summary report"
        headers={["Metric", "Value"]}
        rows={[
          ["Total cars", String(stats.totalCars)],
          ["Cars in stock", String(stats.carsInStock)],
          ["Cars sold", String(stats.carsSold)],
          ["Open document tasks", String(stats.openDocumentTasks)],
          ["Active detailing orders", String(stats.activeDetailingOrders)],
          ["Total clients", String(clientsResult.count ?? 0)],
          ["Total income", formatCurrency(income)],
          ["Total expenses", formatCurrency(expense)],
          ["Net profit", formatCurrency(income - expense)],
          ["Monthly profit", formatCurrency(stats.monthlyProfit)],
        ]}
      />
    </div>
  );
}
