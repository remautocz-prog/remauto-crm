"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Car,
  ClipboardList,
  FileText,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getDetailingFilterHref } from "@/lib/dashboard/links";
import type { OwnerDashboardData } from "@/lib/types/owner-dashboard";
import { DateRangeSelector } from "@/components/shared/date-range-selector";
import { buildDateRangeHref } from "@/lib/date-range/filter";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OwnerAttentionSection } from "@/components/dashboard/owner-attention-section";
import {
  OwnerProfitDirectionChart,
  OwnerProfitTrendChart,
} from "@/components/dashboard/owner-charts";
import { OwnerBusinessDirectionCards } from "@/components/dashboard/owner-business-direction-cards";
import { OwnerKpiCard } from "@/components/dashboard/owner-kpi-card";
import { OwnerRecentActivity } from "@/components/dashboard/owner-recent-activity";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { getCustomerDisplayName } from "@/lib/detailing/validation";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateDocumentStatus } from "@/lib/i18n/documents";

type OwnerDashboardProps = {
  data: OwnerDashboardData;
  userName?: string | null;
};

function TodayList({
  title,
  emptyMessage,
  error,
  children,
}: {
  title: string;
  emptyMessage: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-zinc-300">{title}</h4>
      {error ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
          {error}
        </p>
      ) : (
        children ?? (
          <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-4 text-xs text-zinc-500">
            {emptyMessage}
          </p>
        )
      )}
    </div>
  );
}

export function OwnerDashboard({ data, userName }: OwnerDashboardProps) {
  const t = useTranslations("dashboard.owner");
  const tDocStatus = useTranslations("documents.status");
  const tDetailingStatus = useTranslations("detailing.status");
  const tDateRange = useTranslations("dateRange");
  const { formatCurrency, formatNumber, formatDate } = useFormatters();
  const dash = "—";
  const loadFailed = t("sectionLoadFailed");
  const periodSubtitle =
    data.dateRange.preset === "custom"
      ? `${formatDate(data.dateRange.from, dash)} – ${formatDate(data.dateRange.to, dash)}`
      : tDateRange(`preset.${data.dateRange.preset}` as "preset.today");

  const directionLabels = {
    directionOwnedCars: t("directionOwnedCars"),
    directionCommissionCars: t("directionCommissionCars"),
    directionDetailing: t("directionDetailing"),
    directionDocuments: t("directionDocuments"),
  };

  const financeHref = buildDateRangeHref("/finance", data.dateRange);

  const kpiCards = [
    {
      id: "monthly-profit",
      label: t("realizedProfit"),
      value: formatCurrency(data.topCards.monthlyProfit),
      hint: periodSubtitle,
      icon: Wallet,
      tone: "profit" as const,
      href: financeHref,
    },
    {
      id: "cars-in-stock",
      label: t("carsInStock"),
      value: formatNumber(data.topCards.carsInStock),
      hint: t("ownedActiveHint"),
      icon: Car,
      tone: "cars" as const,
      href: "/cars?status=in_stock&business_model=owned",
    },
    {
      id: "commission-cars",
      label: t("commissionCars"),
      value: formatNumber(data.topCards.commissionCarsInStock),
      hint: t("commissionActiveHint"),
      icon: Car,
      tone: "commission" as const,
      href: "/cars?business_model=commission",
    },
    {
      id: "documents-progress",
      label: t("documentsInProgress"),
      value: formatNumber(data.topCards.documentsInProgress),
      hint: t("openTasksHint"),
      icon: FileText,
      tone: "documents" as const,
      href: "/documents",
    },
    {
      id: "detailing-today",
      label: t("detailingToday"),
      value: formatNumber(data.topCards.detailingOrdersToday),
      hint: t("appointmentsHint"),
      icon: Sparkles,
      tone: "detailing" as const,
      href: "/detailing",
    },
    {
      id: "unpaid-detailing",
      label: t("unpaidDetailing"),
      value: formatCurrency(data.topCards.detailingReceivables.outstandingAmount),
      hint: t("unpaidDetailingOrdersHint", {
        count: data.topCards.detailingReceivables.unpaidOrderCount,
      }),
      icon: ClipboardList,
      tone: "attention" as const,
      href: getDetailingFilterHref({ paymentOutstanding: true }),
    },
    {
      id: "requires-attention",
      label: t("requiresAttention"),
      value: formatNumber(data.attention.summary.total),
      hint: t("actionRequiredHint"),
      icon: AlertTriangle,
      tone: "attention" as const,
      href: "#attention",
    },
  ];

  const formatShortDate = (value: string) =>
    formatDate(value, dash).replace(/\s/g, " ").slice(0, 6);

  return (
    <div>
      <header>
        <DashboardHeader userName={userName} title={t("title")} />

        <DateRangeSelector
          from={data.dateRange.from}
          to={data.dateRange.to}
          preset={data.dateRange.preset}
          className="mt-5"
        />
      </header>

      <section className="mt-7">
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-2">
          <OwnerKpiCard
            key={kpiCards[0].id}
            label={kpiCards[0].label}
            value={kpiCards[0].value}
            hint={kpiCards[0].hint}
            icon={kpiCards[0].icon}
            tone={kpiCards[0].tone}
            href={kpiCards[0].href}
          />
          <OwnerKpiCard
            label={t("documentsProfit")}
            value={formatCurrency(data.topCards.documentsProfit)}
            hint={periodSubtitle}
            icon={FileText}
            tone="documents"
            href={financeHref}
          />
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {t("businessResultsByDirection")}
          </h2>
          <p className="text-xs text-zinc-500">{periodSubtitle}</p>
        </div>
        <OwnerBusinessDirectionCards
          directions={data.businessDirections}
          comparisons={data.businessDirectionComparisons}
          dateRange={data.dateRange}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      </section>

      <section className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {tDateRange("currentSnapshot")}
        </p>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {kpiCards.slice(1).map((card) => (
            <OwnerKpiCard
              key={card.id}
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              tone={card.tone}
              href={card.href}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold text-white">{t("profitTrend")}</h3>
              <p className="text-xs text-zinc-500">{periodSubtitle}</p>
            </div>
          </div>
          {data.errors.charts ? (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              {loadFailed}
            </p>
          ) : (
            <OwnerProfitTrendChart
              data={data.charts.profitTrend}
              formatCurrency={formatCurrency}
              formatShortDate={formatShortDate}
              emptyLabel={t("noChartData")}
            />
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">{t("profitByDirection")}</h3>
            <p className="text-xs text-zinc-500">{periodSubtitle}</p>
          </div>
          {data.errors.charts ? (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              {loadFailed}
            </p>
          ) : (
            <OwnerProfitDirectionChart
              data={data.charts.profitByDirection}
              labels={directionLabels}
              formatCurrency={formatCurrency}
              emptyLabel={t("noChartData")}
            />
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <h3 className="mb-4 text-base font-semibold text-white">{t("today")}</h3>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-5">
            <TodayList
              title={t("detailingAppointmentsToday")}
              emptyMessage={t("nothingToday")}
              error={data.errors.detailing ? loadFailed : undefined}
            >
              {data.today.detailingAppointments.length > 0 ? (
                <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
                  {data.today.detailingAppointments.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/detailing/orders/${order.id}`}
                        className="block px-3 py-3 transition-colors hover:bg-zinc-800/40"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {getCustomerDisplayName(order) || order.vehicle_make_model}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {order.appointment_time?.slice(0, 5)} ·{" "}
                          {tDetailingStatus(order.status)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList
              title={t("readyForDelivery")}
              emptyMessage={t("nothingToday")}
              error={data.errors.detailing ? loadFailed : undefined}
            >
              {data.today.detailingReady.length > 0 ? (
                <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
                  {data.today.detailingReady.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/detailing/orders/${order.id}`}
                        className="block px-3 py-3 transition-colors hover:bg-zinc-800/40"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {order.vehicle_make_model}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {order.registration_number || order.order_number}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>
          </div>

          <div className="space-y-5">
            <TodayList
              title={t("documentsDueToday")}
              emptyMessage={t("nothingToday")}
              error={data.errors.documents ? loadFailed : undefined}
            >
              {data.today.documentsDueToday.length > 0 ? (
                <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
                  {data.today.documentsDueToday.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/documents/${task.id}`}
                        className="block px-3 py-3 transition-colors hover:bg-zinc-800/40"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {getDocumentVehicleTitle(task, task.car, dash)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {translateDocumentStatus(tDocStatus, task.status)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList
              title={t("overdueDocuments")}
              emptyMessage={t("nothingToday")}
              error={data.errors.documents ? loadFailed : undefined}
            >
              {data.today.overdueTasks.length > 0 ? (
                <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
                  {data.today.overdueTasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/documents/${task.id}`}
                        className="block px-3 py-3 transition-colors hover:bg-zinc-800/40"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {getDocumentVehicleTitle(task, task.car, dash)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(task.deadline, dash)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>
          </div>
        </div>
      </section>

      <OwnerAttentionSection
        attention={data.attention}
        quickActions={data.attentionQuickActions}
      />

      <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">{t("archiveSummaryTitle")}</h3>
          <span className="text-xs text-zinc-500">{t("archiveSummaryHint")}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/documents?segment=archived"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 transition-colors hover:border-zinc-700"
          >
            <p className="text-sm text-zinc-400">{t("archiveDocuments")}</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {formatNumber(data.archiveCounts.documents)}
            </p>
          </Link>
          <Link
            href="/detailing/orders?segment=archived"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 transition-colors hover:border-zinc-700"
          >
            <p className="text-sm text-zinc-400">{t("archiveDetailing")}</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {formatNumber(data.archiveCounts.detailing)}
            </p>
          </Link>
          <Link
            href="/deals?segment=archived"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 transition-colors hover:border-zinc-700"
          >
            <p className="text-sm text-zinc-400">{t("archiveDeals")}</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {formatNumber(data.archiveCounts.deals)}
            </p>
          </Link>
        </div>
      </section>

      <div className="mt-8">
        <OwnerRecentActivity
          items={data.recentActivity}
          error={data.errors.activity ? loadFailed : undefined}
        />
      </div>
    </div>
  );
}
