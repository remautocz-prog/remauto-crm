"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FinanceBusinessDirectionCards } from "@/lib/finance/finance-center-directions";
import { cn } from "@/lib/utils";

type BusinessDirectionCardsProps = {
  directions: FinanceBusinessDirectionCards;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
};

const CARD_STYLES = {
  cars: {
    border: "border-sky-500/25",
    glow: "from-sky-500/8",
    hero: "text-sky-300",
    badge: "bg-sky-500/10 text-sky-200/80",
  },
  detailing: {
    border: "border-orange-500/25",
    glow: "from-orange-500/8",
    hero: "text-emerald-300",
    badge: "bg-orange-500/10 text-orange-200/80",
  },
  documents: {
    border: "border-violet-500/25",
    glow: "from-violet-500/8",
    hero: "text-violet-300",
    badge: "bg-violet-500/10 text-violet-200/80",
  },
} as const;

function MetricRow({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: string;
  subdued?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums text-sm",
          subdued ? "font-medium text-zinc-300" : "font-semibold text-zinc-100"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DirectionCard({
  title,
  countLabel,
  countValue,
  heroLabel,
  heroValue,
  tone,
  children,
}: {
  title: string;
  countLabel: string;
  countValue: string;
  heroLabel: string;
  heroValue: string;
  tone: keyof typeof CARD_STYLES;
  children: ReactNode;
}) {
  const styles = CARD_STYLES[tone];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-zinc-950/50 p-5",
        styles.border
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent",
          styles.glow
        )}
      />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-200">
            {title}
          </h3>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px]", styles.badge)}>
            {countLabel}: {countValue}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">{heroLabel}</p>
          <p className={cn("text-3xl font-bold tabular-nums tracking-tight", styles.hero)}>
            {heroValue}
          </p>
        </div>

        <div className="space-y-2 border-t border-zinc-800/80 pt-3">{children}</div>
      </div>
    </article>
  );
}

export function BusinessDirectionCards({
  directions,
  formatCurrency,
  formatNumber,
}: BusinessDirectionCardsProps) {
  const t = useTranslations("finance");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DirectionCard
        title={t("directionCars")}
        countLabel={t("soldVehiclesCount")}
        countValue={formatNumber(directions.cars.soldCount)}
        heroLabel={t("realizedProfit")}
        heroValue={formatCurrency(directions.cars.profit)}
        tone="cars"
      >
        <MetricRow
          label={t("realizedExpenses")}
          value={formatCurrency(directions.cars.expenses)}
          subdued
        />
      </DirectionCard>

      <DirectionCard
        title={t("directionDetailing")}
        countLabel={t("deliveredOrdersCount")}
        countValue={formatNumber(directions.detailing.orderCount)}
        heroLabel={t("netResult")}
        heroValue={formatCurrency(directions.detailing.netResult)}
        tone="detailing"
      >
        <MetricRow
          label={t("detailingRevenue")}
          value={formatCurrency(directions.detailing.revenue)}
          subdued
        />
        <MetricRow
          label={t("detailingCommissions")}
          value={formatCurrency(directions.detailing.commissions)}
          subdued
        />
        <MetricRow
          label={t("detailingExpenses")}
          value={formatCurrency(directions.detailing.expenses)}
          subdued
        />
      </DirectionCard>

      <DirectionCard
        title={t("directionDocuments")}
        countLabel={t("completedTasksCount")}
        countValue={formatNumber(directions.documents.completedCount)}
        heroLabel={t("documentsProfit")}
        heroValue={formatCurrency(directions.documents.profit)}
        tone="documents"
      >
        <MetricRow
          label={t("documentsRevenue")}
          value={formatCurrency(directions.documents.revenue)}
          subdued
        />
        <MetricRow
          label={t("documentsExpenses")}
          value={formatCurrency(directions.documents.expenses)}
          subdued
        />
        <MetricRow
          label={t("paidDocumentsRevenue")}
          value={formatCurrency(directions.documents.paidRevenue)}
          subdued
        />
        <MetricRow
          label={t("unpaidDocumentsRevenue")}
          value={formatCurrency(directions.documents.unpaidRevenue)}
          subdued
        />
      </DirectionCard>
    </div>
  );
}
