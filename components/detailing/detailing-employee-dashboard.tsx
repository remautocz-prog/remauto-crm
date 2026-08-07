"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Car,
  CircleDollarSign,
  ClipboardList,
  Plus,
  Wallet,
} from "lucide-react";
import { DateRangeSelector } from "@/components/shared/date-range-selector";
import { DetailingPaymentStatusControl } from "@/components/detailing/order-payment-status-control";
import { DetailingOrderStatusControl } from "@/components/detailing/order-status-control";
import { DetailingEmptyState } from "@/components/detailing/detailing-empty-state";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { DetailingStatCard } from "@/components/detailing/detailing-stat-card";
import { buildServicesSummary } from "@/lib/detailing/validation";
import type {
  DetailingEmployeeDashboardData,
  DetailingEmployeeDashboardOrder,
} from "@/lib/types/detailing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type DetailingEmployeeDashboardProps = {
  data: DetailingEmployeeDashboardData;
  selectedEmployee: string;
  canUpdatePayment: boolean;
};

function buildMyServicesSummary(entry: DetailingEmployeeDashboardOrder) {
  if (entry.myServices.length) {
    return buildServicesSummary(entry.myServices);
  }
  return buildServicesSummary(entry.order.services ?? []);
}

export function DetailingEmployeeDashboard({
  data,
  selectedEmployee,
  canUpdatePayment,
}: DetailingEmployeeDashboardProps) {
  const t = useTranslations("detailing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrency, formatDate } = useFormatters();
  const dash = "—";
  const periodLabel = `${formatDate(data.dateRange.from, dash)} – ${formatDate(data.dateRange.to, dash)}`;
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const hasOrders =
    data.todayOrders.length > 0 ||
    data.attentionOrders.length > 0 ||
    data.earnedOrders.length > 0;

  function updateEmployee(nextEmployee: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextEmployee && nextEmployee !== "self") {
      params.set("employee", nextEmployee);
    } else {
      params.delete("employee");
    }
    router.push(`/detailing?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <DetailingPageHeader
        title={t("employeeDashboardTitle")}
        description={t("employeeDashboardDescription")}
        action={{
          label: t("newOrder"),
          href: "/detailing/orders/new",
          icon: Plus,
        }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <DateRangeSelector
          from={data.dateRange.from}
          to={data.dateRange.to}
          preset={data.dateRange.preset as "today"}
        />
        {data.canSelectEmployee ? (
          <div className="w-full max-w-xs space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("fields.employee")}
            </p>
            <Select
              value={selectedEmployee || data.employeeId}
              onValueChange={updateEmployee}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {data.assigneeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("employeeDashboardToday")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DetailingStatCard
            label={t("employeeKpi.myTasksToday")}
            value={String(data.kpis.myTasksToday)}
            icon={Calendar}
            iconAccent="text-blue-400"
          />
          <DetailingStatCard
            label={t("employeeKpi.inProgress")}
            value={String(data.kpis.inProgress)}
            icon={Car}
            iconAccent="text-amber-400"
          />
          <DetailingStatCard
            label={t("employeeKpi.ready")}
            value={String(data.kpis.ready)}
            icon={ClipboardList}
            iconAccent="text-emerald-400"
          />
          <DetailingStatCard
            label={t("employeeKpi.unpaidOrders")}
            value={String(data.kpis.unpaidOrders)}
            icon={Wallet}
            iconAccent="text-amber-400"
          />
          <div
            className={cn(
              "rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4",
              "ring-1 ring-emerald-900/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-500/80">
                  {t("employeeKpi.myEarnedCommission")}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-300">
                  {formatCurrency(data.kpis.myEarnedCommission)}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                  {t("employeeKpi.selectedPeriod")}: {periodLabel}
                </p>
                {data.kpis.myEarnedCommission === 0 ? (
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                    {t("employeeKpi.noEarningsInPeriod")}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                    {t("employeeKpi.accruedCommissionHint")}
                  </p>
                )}
              </div>
              <CircleDollarSign className="h-5 w-5 shrink-0 text-emerald-400/80" />
            </div>
          </div>
        </div>
      </section>

      {!hasOrders ? (
        <DetailingEmptyState
          title={t("emptyDashboardTitle")}
          description={t("employeeDashboardEmpty")}
          icon={ClipboardList}
          action={{ label: t("createFirstOrder"), href: "/detailing/orders/new" }}
        />
      ) : null}

      {toast ? (
        <p
          className={
            toast.type === "error"
              ? "text-sm text-red-400"
              : toast.type === "warning"
                ? "text-sm text-amber-400"
                : "text-sm text-green-400"
          }
        >
          {toast.message}
        </p>
      ) : null}

      <DetailingSection title={t("todaysAppointments")} noPadding>
        <DetailingTable
          headers={[
            t("fields.time"),
            t("columns.vehicle"),
            t("fields.registration"),
            t("columns.services"),
            t("employeeKpi.myCommission"),
            t("columns.payment"),
            t("columns.status"),
          ]}
          isEmpty={!data.todayOrders.length}
          emptyMessage={t("noTodaysAppointments")}
        >
          {data.todayOrders.map((entry) => (
            <tr key={entry.order.id} className="transition-colors hover:bg-zinc-900/50">
              <td className="whitespace-nowrap px-4 py-3">
                <Link
                  href={`/detailing/orders/${entry.order.id}`}
                  className="font-medium text-red-400 hover:underline"
                >
                  {entry.order.appointment_time.slice(0, 5)}
                </Link>
              </td>
              <td className="px-4 py-3 text-white">{entry.order.vehicle_make_model}</td>
              <td className="px-4 py-3 text-zinc-400">{entry.order.registration_number}</td>
              <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-400">
                {buildMyServicesSummary(entry)}
              </td>
              <td className="px-4 py-3 font-medium text-emerald-300">
                {formatCurrency(entry.myCommission)}
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {canUpdatePayment ? (
                  <DetailingPaymentStatusControl
                    orderId={entry.order.id}
                    orderStatus={entry.order.status}
                    paymentStatus={entry.order.payment_status}
                    paidAmount={entry.order.paid_amount}
                    remainingAmount={entry.order.remaining_amount}
                    finalPrice={entry.order.final_price}
                    onToast={setToast}
                    compact
                  />
                ) : (
                  <span className="text-zinc-400">{entry.order.payment_status}</span>
                )}
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <DetailingOrderStatusControl
                  orderId={entry.order.id}
                  status={entry.order.status}
                  onToast={setToast}
                  compact
                />
              </td>
            </tr>
          ))}
        </DetailingTable>
      </DetailingSection>

      <DetailingSection title={t("attentionOrders")}>
        <div className="space-y-2">
          {data.attentionOrders.map((entry) => (
            <div
              key={entry.order.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/detailing/orders/${entry.order.id}`}
                  className="font-semibold text-red-400 hover:underline"
                >
                  {entry.order.order_number}
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {canUpdatePayment ? (
                    <DetailingPaymentStatusControl
                      orderId={entry.order.id}
                      orderStatus={entry.order.status}
                      paymentStatus={entry.order.payment_status}
                      paidAmount={entry.order.paid_amount}
                      remainingAmount={entry.order.remaining_amount}
                      finalPrice={entry.order.final_price}
                      onToast={setToast}
                      compact
                    />
                  ) : null}
                  <DetailingOrderStatusControl
                    orderId={entry.order.id}
                    status={entry.order.status}
                    onToast={setToast}
                    compact
                  />
                </div>
              </div>
              <Link
                href={`/detailing/orders/${entry.order.id}`}
                className="mt-1 block text-sm text-zinc-400 hover:text-zinc-300"
              >
                {formatDate(entry.order.appointment_date)} · {entry.order.vehicle_make_model} ·{" "}
                {entry.order.registration_number}
              </Link>
              <p className="mt-1 text-sm text-zinc-500">{buildMyServicesSummary(entry)}</p>
              <p className="mt-2 text-sm font-medium text-emerald-300">
                {t("employeeKpi.myCommission")}: {formatCurrency(entry.myCommission)}
              </p>
            </div>
          ))}
          {!data.attentionOrders.length ? (
            <p className="py-6 text-center text-sm text-zinc-500">{t("noAttention")}</p>
          ) : null}
        </div>
      </DetailingSection>

      <DetailingSection title={t("employeeKpi.earnedInPeriod")} noPadding>
        <DetailingTable
          headers={[
            t("fields.date"),
            t("columns.vehicle"),
            t("fields.registration"),
            t("columns.services"),
            t("employeeKpi.myCommission"),
            t("columns.payment"),
          ]}
          isEmpty={!data.earnedOrders.length}
          emptyMessage={t("employeeKpi.noEarningsInPeriod")}
        >
          {data.earnedOrders.map((entry) => (
            <tr key={entry.order.id} className="transition-colors hover:bg-zinc-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/detailing/orders/${entry.order.id}`}
                  className="font-medium text-red-400 hover:underline"
                >
                  {formatDate(entry.order.actual_completion_at, "—")}
                </Link>
              </td>
              <td className="px-4 py-3 text-white">{entry.order.vehicle_make_model}</td>
              <td className="px-4 py-3 text-zinc-400">{entry.order.registration_number}</td>
              <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-400">
                {buildMyServicesSummary(entry)}
              </td>
              <td className="px-4 py-3 font-medium text-emerald-300">
                {formatCurrency(entry.myCommission)}
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {canUpdatePayment ? (
                  <DetailingPaymentStatusControl
                    orderId={entry.order.id}
                    orderStatus={entry.order.status}
                    paymentStatus={entry.order.payment_status}
                    paidAmount={entry.order.paid_amount}
                    remainingAmount={entry.order.remaining_amount}
                    finalPrice={entry.order.final_price}
                    onToast={setToast}
                    compact
                  />
                ) : (
                  <span className="text-zinc-400">{entry.order.payment_status}</span>
                )}
              </td>
            </tr>
          ))}
        </DetailingTable>
      </DetailingSection>
    </div>
  );
}
