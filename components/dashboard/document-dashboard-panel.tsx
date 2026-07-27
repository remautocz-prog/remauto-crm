"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type {
  DocumentDashboardAlert,
  DocumentDashboardMetrics,
  DocumentEmployeeWorkload,
  DocumentTodaysWorkItem,
} from "@/lib/types/documents";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { DocumentDeadlineDisplay } from "@/components/documents/document-deadline-display";
import { DocumentPriorityBadge } from "@/components/documents/document-priority-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DocumentDashboardPanelProps = {
  metrics: DocumentDashboardMetrics;
  alerts: DocumentDashboardAlert[];
  todaysWork: DocumentTodaysWorkItem[];
  employeeWorkload: DocumentEmployeeWorkload[];
};

export function DocumentDashboardPanel({
  metrics,
  alerts,
  todaysWork,
  employeeWorkload,
}: DocumentDashboardPanelProps) {
  const t = useTranslations("documents.dashboard");
  const tDocuments = useTranslations("documents");
  const tCommon = useTranslations("common");
  const { formatCurrency, formatNumber } = useFormatters();
  const dash = tCommon("dash");

  const statItems = [
    { label: t("activeTasks"), value: formatNumber(metrics.activeTasks) },
    { label: t("newTasks"), value: formatNumber(metrics.newTasks) },
    { label: t("overdueOrders"), value: formatNumber(metrics.overdueTasks) },
    { label: t("dueTodayOrders"), value: formatNumber(metrics.dueTodayTasks) },
    { label: t("unassignedOrders"), value: formatNumber(metrics.unassignedActiveTasks) },
    { label: t("waitingClient"), value: formatNumber(metrics.waitingClient) },
    { label: t("waitingOffice"), value: formatNumber(metrics.waitingOffice) },
    { label: t("urgentOrders"), value: formatNumber(metrics.urgentActiveTasks) },
    { label: t("completedThisMonth"), value: formatNumber(metrics.completedThisMonth) },
    { label: t("unpaidBalance"), value: formatCurrency(metrics.unpaidBalance) },
    { label: t("monthlyRevenue"), value: formatCurrency(metrics.monthlyRevenue) },
    { label: t("monthlyProfit"), value: formatCurrency(metrics.monthlyProfit) },
  ];

  return (
    <div className="space-y-4">
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("todaysWork")}</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysWork.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("noTodaysWork")}</p>
            ) : (
              <ul className="space-y-3">
                {todaysWork.map((task) => (
                  <li key={task.id} className="rounded-lg border border-zinc-800/80 p-3">
                    <Link href={`/documents/${task.id}`} className="font-medium text-white hover:text-red-400">
                      {task.client
                        ? getClientDisplayName(task.client)
                        : tDocuments("taskFallback", { id: task.id })}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {getDocumentVehicleTitle(task, task.car, dash)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-zinc-400">
                        {task.assignee?.full_name ?? tDocuments("unassigned")}
                      </span>
                      <DocumentDeadlineDisplay task={task} />
                      <DocumentStatusBadge status={task.status} />
                      <DocumentPriorityBadge priority={task.priority} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("employeeWorkload")}</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeWorkload.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("noEmployeeWorkload")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="pb-2 font-medium">{tDocuments("responsibleEmployee")}</th>
                      <th className="pb-2 font-medium">{t("activeOrders")}</th>
                      <th className="pb-2 font-medium">{t("overdueOrders")}</th>
                      <th className="pb-2 font-medium">{t("dueTodayOrders")}</th>
                      <th className="pb-2 font-medium">{t("urgentOrders")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeWorkload.map((row) => (
                      <tr key={row.employeeId} className="border-t border-zinc-800/80">
                        <td className="py-2 text-zinc-200">{row.employeeName}</td>
                        <td className="py-2 text-zinc-300">{formatNumber(row.activeOrders)}</td>
                        <td className="py-2 text-red-400">{formatNumber(row.overdueOrders)}</td>
                        <td className="py-2 text-orange-400">{formatNumber(row.dueTodayOrders)}</td>
                        <td className="py-2 text-zinc-300">{formatNumber(row.urgentOrders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
