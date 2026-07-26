import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getCarBusinessStats } from "@/lib/queries/car-business-stats";
import { createClient } from "@/lib/supabase/server";
import {
  FINANCE_TYPE_EXPENSE,
  FINANCE_TYPE_INCOME,
} from "@/lib/constants/status";
import { isValidLocale, type AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reports") };
}

export default async function ReportsPage() {
  const supabase = await createClient();

  const [stats, businessStats, clientsResult, financeResult, t, tDashboard, rawLocale] =
    await Promise.all([
      getDashboardStats(),
      getCarBusinessStats(),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("finance_transactions").select("type, amount"),
      getTranslations("reports"),
      getTranslations("dashboard"),
      getLocale(),
    ]);

  if (clientsResult.error) throw clientsResult.error;
  if (financeResult.error) throw financeResult.error;

  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";

  const income =
    financeResult.data
      ?.filter((item) => item.type === FINANCE_TYPE_INCOME)
      .reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;
  const expense =
    financeResult.data
      ?.filter((item) => item.type === FINANCE_TYPE_EXPENSE)
      .reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <DataTable
        title={t("tableTitle")}
        headers={[t("metric"), t("value")]}
        rows={[
          [tDashboard("totalCars"), formatNumber(stats.totalCars, locale)],
          [tDashboard("carsInStock"), formatNumber(stats.carsInStock, locale)],
          [tDashboard("carsSold"), formatNumber(stats.carsSold, locale)],
          [
            tDashboard("openDocumentTasks"),
            formatNumber(stats.openDocumentTasks, locale),
          ],
          [
            tDashboard("activeDetailingOrders"),
            formatNumber(stats.activeDetailingOrders, locale),
          ],
          [t("totalClients"), formatNumber(clientsResult.count ?? 0, locale)],
          [t("totalIncome"), formatCurrency(income, locale)],
          [t("totalExpenses"), formatCurrency(expense, locale)],
          [t("netProfit"), formatCurrency(income - expense, locale)],
          [t("monthlyProfit"), formatCurrency(stats.monthlyProfit, locale)],
          [tDashboard("overallProfit"), formatCurrency(businessStats.overallProfit, locale)],
          [`${t("ownedStats")} — ${tDashboard("ownedInStock")}`, formatNumber(businessStats.owned.inStock, locale)],
          [`${t("ownedStats")} — ${tDashboard("ownedSold")}`, formatNumber(businessStats.owned.sold, locale)],
          [`${t("ownedStats")} — ${tDashboard("ownedRevenue")}`, formatCurrency(businessStats.owned.revenue, locale)],
          [`${t("ownedStats")} — ${tDashboard("ownedProfit")}`, formatCurrency(businessStats.owned.profit, locale)],
          [`${t("commissionStats")} — ${tDashboard("commissionActive")}`, formatNumber(businessStats.commission.active, locale)],
          [`${t("commissionStats")} — ${tDashboard("commissionSold")}`, formatNumber(businessStats.commission.sold, locale)],
          [`${t("commissionStats")} — ${tDashboard("commissionRevenue")}`, formatCurrency(businessStats.commission.revenue, locale)],
          [`${t("commissionStats")} — ${tDashboard("commissionProfit")}`, formatCurrency(businessStats.commission.profit, locale)],
          [`${t("clientOrderStats")} — ${tDashboard("clientOrderActive")}`, formatNumber(businessStats.clientOrder.active, locale)],
          [`${t("clientOrderStats")} — ${tDashboard("clientOrderCompleted")}`, formatNumber(businessStats.clientOrder.completed, locale)],
          [`${t("clientOrderStats")} — ${tDashboard("clientOrderRevenue")}`, formatCurrency(businessStats.clientOrder.revenue, locale)],
          [`${t("clientOrderStats")} — ${tDashboard("clientOrderProfit")}`, formatCurrency(businessStats.clientOrder.profit, locale)],
        ]}
      />
    </div>
  );
}
