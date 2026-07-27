"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DashboardBusinessOverview } from "@/lib/types/dashboard";
import { getDocumentsFilterHref } from "@/lib/dashboard/links";
import { DashboardSectionState } from "@/components/dashboard/dashboard-section-state";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DashboardBusinessOverviewProps = {
  business: DashboardBusinessOverview;
  activeInventoryValue: number;
  errors?: {
    cars?: string;
    clients?: string;
    documents?: string;
  };
};

export function DashboardBusinessOverviewSection({
  business,
  activeInventoryValue,
  errors,
}: DashboardBusinessOverviewProps) {
  const t = useTranslations("dashboard");
  const { formatNumber, formatCurrency } = useFormatters();

  const sectionError = errors?.cars ?? errors?.clients ?? errors?.documents;

  const carMetrics = [
    { label: t("activeCars"), value: formatNumber(business.activeCars) },
    { label: t("reservedCars"), value: formatNumber(business.reservedCars) },
    { label: t("soldThisPeriod"), value: formatNumber(business.soldThisPeriod) },
    { label: t("commissionCars"), value: formatNumber(business.commissionCars) },
    {
      label: t("activeInventoryValue"),
      value: formatCurrency(activeInventoryValue),
    },
  ];

  const documentMetrics = [
    { label: t("activeDocumentOrders"), value: formatNumber(business.activeDocumentOrders) },
    {
      label: t("completedThisPeriod"),
      value: formatNumber(business.completedThisPeriod),
    },
    {
      label: t("unpaidOrders"),
      value: formatNumber(business.unpaidOrders),
      href: getDocumentsFilterHref({ paymentOutstanding: true }),
    },
    {
      label: t("overdueOrders"),
      value: formatNumber(business.overdueOrders),
      href: getDocumentsFilterHref({ overdue: true }),
    },
  ];

  const clientMetrics = [
    { label: t("activeClients"), value: formatNumber(business.activeClients) },
    {
      label: t("newClientsThisPeriod"),
      value: formatNumber(business.newClientsThisPeriod),
    },
    { label: t("clientsWithDebt"), value: formatNumber(business.clientsWithDebt) },
  ];

  return (
    <DashboardSectionState title={t("businessOverview")} error={sectionError}>
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricGroup title={t("carsSection")} metrics={carMetrics} error={errors?.cars} />
        <MetricGroup
          title={t("documentsSection")}
          metrics={documentMetrics}
          error={errors?.documents}
        />
        <MetricGroup title={t("clientsSection")} metrics={clientMetrics} error={errors?.clients} />
      </div>
    </DashboardSectionState>
  );
}

function MetricGroup({
  title,
  metrics,
  error,
}: {
  title: string;
  metrics: Array<{ label: string; value: string; href?: string }>;
  error?: string;
}) {
  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {metrics.map((metric) => {
          const content = (
            <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
              <CardContent className="p-3">
                <p className="text-xs text-zinc-500">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
              </CardContent>
            </Card>
          );

          if (metric.href) {
            return (
              <Link key={metric.label} href={metric.href}>
                {content}
              </Link>
            );
          }

          return <div key={metric.label}>{content}</div>;
        })}
      </div>
    </div>
  );
}
