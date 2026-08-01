"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Car,
  CircleDollarSign,
  ClipboardList,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type {
  DetailingDashboardStats,
  DetailingOrderWithServices,
} from "@/lib/types/detailing";
import { buildServicesSummary, getCustomerDisplayName } from "@/lib/detailing/validation";
import { buildOrderEmployeeNames } from "@/lib/detailing/order-employees";
import { DetailingPaymentStatusControl } from "@/components/detailing/order-payment-status-control";
import { DetailingOrderStatusControl } from "@/components/detailing/order-status-control";
import { DetailingEmptyState } from "@/components/detailing/detailing-empty-state";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { DetailingStatCard } from "@/components/detailing/detailing-stat-card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingDashboardProps = {
  stats: DetailingDashboardStats;
  todayAppointments: DetailingOrderWithServices[];
  attention: DetailingOrderWithServices[];
  recentOrders: DetailingOrderWithServices[];
  hasOrders: boolean;
};

export function DetailingDashboard({
  stats,
  todayAppointments,
  attention,
  recentOrders,
  hasOrders,
}: DetailingDashboardProps) {
  const t = useTranslations("detailing");
  const { formatCurrency, formatDate } = useFormatters();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(
    null
  );

  return (
    <div className="space-y-8">
      <DetailingPageHeader
        title={t("dashboardTitle")}
        description={t("dashboardDescription")}
        action={{
          label: t("newOrder"),
          href: "/detailing/orders/new",
          icon: Plus,
        }}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("today")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailingStatCard
            label={t("metrics.appointmentsToday")}
            value={String(stats.todayAppointments)}
            icon={Calendar}
            iconAccent="text-blue-400"
            href="/detailing/orders"
          />
          <DetailingStatCard
            label={t("metrics.inProgress")}
            value={String(stats.carsInProgress)}
            icon={Car}
            iconAccent="text-amber-400"
            href="/detailing/orders?status=in_progress"
          />
          <DetailingStatCard
            label={t("metrics.readyForDelivery")}
            value={String(stats.carsReady)}
            icon={ClipboardList}
            iconAccent="text-emerald-400"
            href="/detailing/orders?status=ready"
          />
          <DetailingStatCard
            label={t("metrics.revenueToday")}
            value={formatCurrency(stats.revenueToday)}
            icon={TrendingUp}
            iconAccent="text-green-400"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("currentMonth")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailingStatCard
            label={t("metrics.revenue")}
            value={formatCurrency(stats.monthRevenue)}
            icon={Wallet}
            iconAccent="text-green-400"
            href="/detailing/finance"
          />
          <DetailingStatCard
            label={t("metrics.commissions")}
            value={formatCurrency(stats.monthCommissions)}
            icon={Users}
            iconAccent="text-purple-400"
            href="/detailing/employees"
          />
          <DetailingStatCard
            label={t("metrics.expenses")}
            value={formatCurrency(stats.monthExpenses)}
            icon={TrendingDown}
            iconAccent="text-orange-400"
            href="/detailing/expenses"
          />
          <DetailingStatCard
            label={t("metrics.netResult")}
            value={formatCurrency(stats.monthNetResult)}
            icon={CircleDollarSign}
            iconAccent={stats.monthNetResult >= 0 ? "text-emerald-400" : "text-red-400"}
            href="/detailing/finance"
          />
        </div>
      </section>

      {!hasOrders ? (
        <DetailingEmptyState
          title={t("createFirstOrder")}
          description={t("emptyDashboardMessage")}
          icon={ClipboardList}
          action={{ label: t("createFirstOrder"), href: "/detailing/orders/new" }}
          secondaryAction={{ label: t("nav.services"), href: "/detailing/services" }}
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
            t("columns.customer"),
            t("columns.services"),
            t("columns.employee"),
            t("columns.payment"),
            t("columns.status"),
          ]}
          isEmpty={!todayAppointments.length}
          emptyMessage={t("noTodaysAppointments")}
        >
          {todayAppointments.map((order) => (
            <tr key={order.id} className="transition-colors hover:bg-zinc-900/50">
              <td className="whitespace-nowrap px-4 py-3">
                <Link
                  href={`/detailing/orders/${order.id}`}
                  className="font-medium text-red-400 hover:underline"
                >
                  {order.appointment_time.slice(0, 5)}
                </Link>
              </td>
              <td className="px-4 py-3 text-white">{order.vehicle_make_model}</td>
              <td className="px-4 py-3 text-zinc-400">{order.registration_number}</td>
              <td className="px-4 py-3">{getCustomerDisplayName(order) || "—"}</td>
              <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-400">
                {buildServicesSummary(order.services ?? [])}
              </td>
              <td className="px-4 py-3">{buildOrderEmployeeNames(order, order.services ?? [])}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <DetailingPaymentStatusControl
                  orderId={order.id}
                  orderStatus={order.status}
                  paymentStatus={order.payment_status}
                  paidAmount={order.paid_amount}
                  remainingAmount={order.remaining_amount}
                  finalPrice={order.final_price}
                  onToast={setToast}
                  compact
                />
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <DetailingOrderStatusControl
                  orderId={order.id}
                  status={order.status}
                  onToast={setToast}
                  compact
                />
              </td>
            </tr>
          ))}
        </DetailingTable>
      </DetailingSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailingSection title={t("attentionOrders")}>
          <div className="space-y-2">
            {attention.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/detailing/orders/${order.id}`}
                    className="font-semibold text-red-400 hover:underline"
                  >
                    {order.order_number}
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <DetailingPaymentStatusControl
                      orderId={order.id}
                      orderStatus={order.status}
                      paymentStatus={order.payment_status}
                      paidAmount={order.paid_amount}
                      remainingAmount={order.remaining_amount}
                      finalPrice={order.final_price}
                      onToast={setToast}
                      compact
                    />
                    <DetailingOrderStatusControl
                      orderId={order.id}
                      status={order.status}
                      onToast={setToast}
                      compact
                    />
                  </div>
                </div>
                <Link
                  href={`/detailing/orders/${order.id}`}
                  className="mt-1 block text-sm text-zinc-400 hover:text-zinc-300"
                >
                  {formatDate(order.appointment_date)} · {order.vehicle_make_model}
                </Link>
                {order.remaining_amount > 0 && order.payment_status !== "partially_paid" ? (
                  <p className="mt-1 text-sm font-medium text-amber-400">
                    {t("fields.remaining")}: {formatCurrency(order.remaining_amount)}
                  </p>
                ) : null}
              </div>
            ))}
            {!attention.length ? (
              <p className="py-6 text-center text-sm text-zinc-500">{t("noAttention")}</p>
            ) : null}
          </div>
        </DetailingSection>

        <DetailingSection title={t("recentOrders")}>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/detailing/orders/${order.id}`}
                    className="font-semibold text-white hover:text-red-400"
                  >
                    {order.order_number}
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <DetailingPaymentStatusControl
                      orderId={order.id}
                      orderStatus={order.status}
                      paymentStatus={order.payment_status}
                      paidAmount={order.paid_amount}
                      remainingAmount={order.remaining_amount}
                      finalPrice={order.final_price}
                      onToast={setToast}
                      compact
                    />
                    <DetailingOrderStatusControl
                      orderId={order.id}
                      status={order.status}
                      onToast={setToast}
                      compact
                    />
                  </div>
                </div>
                <Link
                  href={`/detailing/orders/${order.id}`}
                  className="mt-1 block text-sm text-zinc-400 hover:text-zinc-300"
                >
                  {order.vehicle_make_model} · {formatCurrency(order.final_price)}
                </Link>
              </div>
            ))}
            {!recentOrders.length ? (
              <p className="py-6 text-center text-sm text-zinc-500">{t("noRecentOrders")}</p>
            ) : null}
          </div>
        </DetailingSection>
      </div>
    </div>
  );
}
