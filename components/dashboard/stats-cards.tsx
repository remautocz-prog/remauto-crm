import {
  Car,
  CheckCircle2,
  FileText,
  Sparkles,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { isValidLocale, type AppLocale } from "@/i18n/config";
import type { CarBusinessStats } from "@/lib/queries/car-business-stats";
import type { DashboardStats } from "@/lib/types/database";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
};

function StatCard({ title, value, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        <div
          className={
            accent
              ? "rounded-lg bg-red-600/15 p-2 text-red-500"
              : "rounded-lg bg-zinc-800 p-2 text-zinc-400"
          }
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function ModelStatsBlock({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <span className="text-zinc-400">{row.label}</span>
            <span className="text-zinc-200">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export async function DashboardStatsCards({
  stats,
  businessStats,
}: {
  stats: DashboardStats;
  businessStats: CarBusinessStats;
}) {
  const t = await getTranslations("dashboard");
  const rawLocale = await getLocale();
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title={t("totalCars")}
          value={formatNumber(stats.totalCars, locale)}
          icon={Car}
        />
        <StatCard
          title={t("carsInStock")}
          value={formatNumber(stats.carsInStock, locale)}
          icon={Warehouse}
        />
        <StatCard
          title={t("carsSold")}
          value={formatNumber(stats.carsSold, locale)}
          icon={CheckCircle2}
        />
        <StatCard
          title={t("openDocumentTasks")}
          value={formatNumber(stats.openDocumentTasks, locale)}
          icon={FileText}
        />
        <StatCard
          title={t("activeDetailingOrders")}
          value={formatNumber(stats.activeDetailingOrders, locale)}
          icon={Sparkles}
        />
        <StatCard
          title={t("overallProfit")}
          value={formatCurrency(businessStats.overallProfit, locale)}
          icon={TrendingUp}
          accent
        />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">
          {t("businessModelsTitle")}
        </h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <ModelStatsBlock
            title={t("ownedTitle")}
            rows={[
              {
                label: t("ownedInStock"),
                value: formatNumber(businessStats.owned.inStock, locale),
              },
              {
                label: t("ownedSold"),
                value: formatNumber(businessStats.owned.sold, locale),
              },
              {
                label: t("ownedRevenue"),
                value: formatCurrency(businessStats.owned.revenue, locale),
              },
              {
                label: t("ownedProfit"),
                value: formatCurrency(businessStats.owned.profit, locale),
              },
            ]}
          />
          <ModelStatsBlock
            title={t("commissionTitle")}
            rows={[
              {
                label: t("commissionActive"),
                value: formatNumber(businessStats.commission.active, locale),
              },
              {
                label: t("commissionSold"),
                value: formatNumber(businessStats.commission.sold, locale),
              },
              {
                label: t("commissionRevenue"),
                value: formatCurrency(businessStats.commission.revenue, locale),
              },
              {
                label: t("commissionProfit"),
                value: formatCurrency(businessStats.commission.profit, locale),
              },
            ]}
          />
          <ModelStatsBlock
            title={t("clientOrderTitle")}
            rows={[
              {
                label: t("clientOrderActive"),
                value: formatNumber(businessStats.clientOrder.active, locale),
              },
              {
                label: t("clientOrderCompleted"),
                value: formatNumber(businessStats.clientOrder.completed, locale),
              },
              {
                label: t("clientOrderRevenue"),
                value: formatCurrency(businessStats.clientOrder.revenue, locale),
              },
              {
                label: t("clientOrderProfit"),
                value: formatCurrency(businessStats.clientOrder.profit, locale),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
