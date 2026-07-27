"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DashboardEmployeeWorkloadRow } from "@/lib/types/dashboard";
import { DashboardSectionState } from "@/components/dashboard/dashboard-section-state";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DashboardEmployeeWorkloadProps = {
  rows: DashboardEmployeeWorkloadRow[];
  error?: string;
};

export function DashboardEmployeeWorkloadSection({
  rows,
  error,
}: DashboardEmployeeWorkloadProps) {
  const t = useTranslations("dashboard");
  const tDocuments = useTranslations("documents");
  const { formatNumber } = useFormatters();

  return (
    <DashboardSectionState
      title={t("employeeWorkload")}
      error={error}
      isEmpty={!error && rows.length === 0}
      emptyMessage={t("noEmployeeWorkload")}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const name =
            row.employeeId === null
              ? tDocuments("unassigned")
              : row.employeeName;

          return (
            <Link key={row.employeeId ?? "unassigned"} href={row.href}>
              <Card className="h-full border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-600">
                <CardContent className="space-y-3 p-4">
                  <p className="truncate font-medium text-white">{name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <WorkloadStat
                      label={t("activeOrdersShort")}
                      value={formatNumber(row.activeOrders)}
                    />
                    <WorkloadStat
                      label={t("overdueOrders")}
                      value={formatNumber(row.overdueOrders)}
                      accent="text-red-400"
                    />
                    <WorkloadStat
                      label={t("dueTodayOrders")}
                      value={formatNumber(row.dueTodayOrders)}
                      accent="text-orange-400"
                    />
                    <WorkloadStat
                      label={t("urgentActiveOrders")}
                      value={formatNumber(row.urgentOrders)}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </DashboardSectionState>
  );
}

function WorkloadStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className={`font-semibold ${accent ?? "text-zinc-200"}`}>{value}</p>
    </div>
  );
}
