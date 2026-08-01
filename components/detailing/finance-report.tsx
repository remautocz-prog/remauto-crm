"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CircleDollarSign,
  Loader2,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { getDetailingEmployeeDisplayName } from "@/lib/detailing/employee-display";
import type { DetailingEmployeeWithProfile, DetailingFinanceReport } from "@/lib/types/detailing";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { DetailingStatCard } from "@/components/detailing/detailing-stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingFinanceReportProps = {
  report: DetailingFinanceReport;
  employees: DetailingEmployeeWithProfile[];
  initialPeriod: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialEmployeeId: string;
};

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function DetailingFinanceReportView({
  report,
  employees,
  initialPeriod,
  initialDateFrom,
  initialDateTo,
  initialEmployeeId,
}: DetailingFinanceReportProps) {
  const t = useTranslations("detailing");
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useState(initialPeriod || "current_month");
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId || "all");

  function applyFilters() {
    const params = new URLSearchParams();
    params.set("period", period);
    if (period === "custom") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
    }
    if (employeeId) params.set("employee_id", employeeId);
    startTransition(() => router.push(`/detailing/finance?${params.toString()}`));
  }

  function handlePeriodChange(next: string) {
    setPeriod(next);
    if (next === "current_month") {
      const range = monthRange(0);
      setDateFrom(range.from);
      setDateTo(range.to);
    } else if (next === "previous_month") {
      const range = monthRange(-1);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }

  return (
    <div className="space-y-8">
      <DetailingPageHeader title={t("financeTitle")} description={t("financeDescription")} />

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="grid gap-3 pt-6 md:grid-cols-5">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">{t("periods.currentMonth")}</SelectItem>
              <SelectItem value="previous_month">{t("periods.previousMonth")}</SelectItem>
              <SelectItem value="custom">{t("periods.custom")}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={period !== "custom"} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={period !== "custom"} />
          <Select value={employeeId || "all"} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder={t("fields.employee")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allEmployees")}</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.profile_id} value={employee.profile_id}>
                  {getDetailingEmployeeDisplayName(employee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={applyFilters} disabled={isPending} size="lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("applyFilters")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DetailingStatCard label={t("metrics.orderCount")} value={String(report.orderCount)} icon={ShoppingBag} iconAccent="text-blue-400" />
        <DetailingStatCard label={t("metrics.deliveredRevenue")} value={formatCurrency(report.deliveredRevenue)} icon={TrendingUp} iconAccent="text-green-400" />
        <DetailingStatCard label={t("metrics.commissions")} value={formatCurrency(report.employeeCommissions)} icon={Users} iconAccent="text-purple-400" />
        <DetailingStatCard label={t("metrics.expenses")} value={formatCurrency(report.expenses)} icon={TrendingDown} iconAccent="text-orange-400" />
        <DetailingStatCard label={t("metrics.netResult")} value={formatCurrency(report.netResult)} icon={CircleDollarSign} iconAccent={report.netResult >= 0 ? "text-emerald-400" : "text-red-400"} />
        <DetailingStatCard label={t("metrics.averageOrder")} value={formatCurrency(report.averageOrderValue)} icon={Receipt} iconAccent="text-zinc-400" />
      </div>

      <DetailingSection title={t("employeeSummary")} noPadding>
        <DetailingTable
          headers={[
            t("fields.employee"),
            t("metrics.assignedServices"),
            t("metrics.deliveredOrders"),
            t("metrics.revenue"),
            t("fields.commissionPercent"),
            t("metrics.commissionPayable"),
          ]}
          isEmpty={!report.employeeSummaries.length}
          emptyMessage={t("noEmployees")}
        >
          {report.employeeSummaries.map((row) => (
            <tr key={row.employeeId ?? row.employeeName}>
              <td className="px-4 py-3 font-medium text-white">{row.employeeName}</td>
              <td className="px-4 py-3">{row.assignedServices}</td>
              <td className="px-4 py-3">{row.deliveredOrders}</td>
              <td className="px-4 py-3">{formatCurrency(row.revenueGenerated)}</td>
              <td className="px-4 py-3">{row.commissionPercent}%</td>
              <td className="px-4 py-3 font-medium">{formatCurrency(row.commissionPayable)}</td>
            </tr>
          ))}
        </DetailingTable>
      </DetailingSection>

      <DetailingSection title={t("expensesByCategory")}>
        <div className="space-y-2">
          {report.expensesByCategory.map((row) => (
            <div
              key={row.category}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3"
            >
              <span className="text-zinc-300">{t(`expenseCategories.${row.category}`)}</span>
              <span className="font-semibold text-white">{formatCurrency(row.amount)}</span>
            </div>
          ))}
          {!report.expensesByCategory.length ? (
            <p className="py-6 text-center text-sm text-zinc-500">{t("noExpenses")}</p>
          ) : null}
        </div>
      </DetailingSection>
    </div>
  );
}
