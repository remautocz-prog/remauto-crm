"use client";

import { useTranslations } from "next-intl";
import type { DashboardFinancialOverview } from "@/lib/types/dashboard";
import { DashboardSectionState } from "@/components/dashboard/dashboard-section-state";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DashboardFinancialOverviewProps = {
  financial: DashboardFinancialOverview;
  error?: string;
};

export function DashboardFinancialOverviewSection({
  financial,
  error,
}: DashboardFinancialOverviewProps) {
  const t = useTranslations("dashboard");
  const { formatCurrency } = useFormatters();

  const documentCards = [
    { label: t("documentRevenue"), value: formatCurrency(financial.documents.revenue) },
    { label: t("documentCosts"), value: formatCurrency(financial.documents.costs) },
    { label: t("documentProfit"), value: formatCurrency(financial.documents.profit) },
    { label: t("collected"), value: formatCurrency(financial.documents.collected) },
    {
      label: t("outstanding"),
      value: formatCurrency(financial.documents.outstanding),
    },
  ];

  const carCards = [
    {
      label: t("activeInventoryValue"),
      value: formatCurrency(financial.cars.activeInventoryValue),
    },
    { label: t("soldRevenue"), value: formatCurrency(financial.cars.soldRevenue) },
    { label: t("soldProfit"), value: formatCurrency(financial.cars.soldProfit) },
  ];

  return (
    <DashboardSectionState title={t("financialOverview")} error={error}>
      <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible">
        <div className="min-w-[16rem] shrink-0 space-y-2 sm:min-w-0 sm:flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("documentsSection")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {documentCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </div>

        <div className="min-w-[16rem] shrink-0 space-y-2 sm:min-w-0 sm:flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("carsSection")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {carCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </div>
      </div>

      <Card className="border-red-500/30 bg-red-950/10">
        <CardContent className="flex items-center justify-between p-4">
          <p className="text-sm font-medium text-zinc-300">{t("combinedProfit")}</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(financial.combinedProfit)}
          </p>
        </CardContent>
      </Card>
    </DashboardSectionState>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardContent className="p-3">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-1 text-base font-semibold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
