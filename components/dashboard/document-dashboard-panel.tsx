"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DocumentDashboardAlert, DocumentDashboardMetrics } from "@/lib/types/documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DocumentDashboardPanelProps = {
  metrics: DocumentDashboardMetrics;
  alerts: DocumentDashboardAlert[];
};

export function DocumentDashboardPanel({
  metrics,
  alerts,
}: DocumentDashboardPanelProps) {
  const t = useTranslations("documents.dashboard");
  const { formatCurrency, formatNumber } = useFormatters();

  const statItems = [
    { label: t("activeTasks"), value: formatNumber(metrics.activeTasks) },
    { label: t("newTasks"), value: formatNumber(metrics.newTasks) },
    { label: t("overdueTasks"), value: formatNumber(metrics.overdueTasks) },
    { label: t("waitingClient"), value: formatNumber(metrics.waitingClient) },
    { label: t("waitingOffice"), value: formatNumber(metrics.waitingOffice) },
    { label: t("completedThisMonth"), value: formatNumber(metrics.completedThisMonth) },
    { label: t("unpaidBalance"), value: formatCurrency(metrics.unpaidBalance) },
    { label: t("monthlyRevenue"), value: formatCurrency(metrics.monthlyRevenue) },
    { label: t("monthlyProfit"), value: formatCurrency(metrics.monthlyProfit) },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("metricsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-zinc-800/80 px-3 py-2">
              <p className="text-xs text-zinc-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("alertsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-zinc-400">{t("noAlerts")}</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link href={alert.href} className="text-sm text-amber-200 hover:text-white">
                    {alert.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
