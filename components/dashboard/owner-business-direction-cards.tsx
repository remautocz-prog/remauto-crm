"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildDateRangeHref } from "@/lib/date-range/filter";
import type {
  BusinessDirectionComparisons,
  FinanceBusinessDirectionCards,
} from "@/lib/finance/finance-center-directions";
import type { PeriodComparison } from "@/lib/finance/period-comparison";
import type { ResolvedDateRange } from "@/lib/date-range/filter";
import { cn } from "@/lib/utils";

type OwnerBusinessDirectionCardsProps = {
  directions: FinanceBusinessDirectionCards;
  comparisons: BusinessDirectionComparisons;
  dateRange: ResolvedDateRange;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
};

const CARD_STYLES = {
  cars: {
    border: "border-sky-500/20 hover:border-sky-500/35",
    hero: "text-sky-300",
    badge: "text-sky-400/70",
  },
  detailing: {
    border: "border-orange-500/20 hover:border-orange-500/35",
    hero: "text-emerald-300",
    badge: "text-orange-400/70",
  },
  documents: {
    border: "border-violet-500/20 hover:border-violet-500/35",
    hero: "text-violet-300",
    badge: "text-violet-400/70",
  },
} as const;

function DirectionComparison({
  comparison,
  comparedLabel,
  newResultLabel,
  noChangeLabel,
}: {
  comparison: PeriodComparison | null;
  comparedLabel: string;
  newResultLabel: string;
  noChangeLabel: string;
}) {
  if (!comparison) return null;

  if (comparison.kind === "new_result") {
    return (
      <p className="text-[11px] text-zinc-500">{newResultLabel}</p>
    );
  }

  const positive = comparison.changePercent > 0;
  const unchanged = comparison.kind === "unchanged";

  return (
    <p
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px]",
        unchanged
          ? "text-zinc-500"
          : positive
            ? "text-emerald-400/80"
            : "text-red-400/80"
      )}
    >
      {!unchanged ? (
        positive ? (
          <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <ArrowDownRight className="h-3 w-3 shrink-0" aria-hidden />
        )
      ) : null}
      <span>
        {unchanged
          ? noChangeLabel
          : `${positive ? "+" : ""}${comparison.changePercent}% ${comparedLabel}`}
      </span>
    </p>
  );
}

function DirectionCard({
  title,
  metricLabel,
  resultValue,
  countLabel,
  countValue,
  comparison,
  comparedLabel,
  newResultLabel,
  noChangeLabel,
  tone,
  href,
}: {
  title: string;
  metricLabel: string;
  resultValue: string;
  countLabel: string;
  countValue: string;
  comparison: PeriodComparison | null;
  comparedLabel: string;
  newResultLabel: string;
  noChangeLabel: string;
  tone: keyof typeof CARD_STYLES;
  href: string;
}) {
  const styles = CARD_STYLES[tone];

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border bg-zinc-950/40 p-4 transition-colors",
        styles.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
          {title}
        </h3>
        <span className={cn("text-[11px] tabular-nums", styles.badge)}>
          {countLabel}: {countValue}
        </span>
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">
        {metricLabel}
      </p>
      <p className={cn("mt-0.5 text-2xl font-bold tabular-nums tracking-tight", styles.hero)}>
        {resultValue}
      </p>

      <div className="mt-2 min-h-[1rem]">
        <DirectionComparison
          comparison={comparison}
          comparedLabel={comparedLabel}
          newResultLabel={newResultLabel}
          noChangeLabel={noChangeLabel}
        />
      </div>
    </Link>
  );
}

export function OwnerBusinessDirectionCards({
  directions,
  comparisons,
  dateRange,
  formatCurrency,
  formatNumber,
}: OwnerBusinessDirectionCardsProps) {
  const t = useTranslations("dashboard.owner");
  const financeHref = buildDateRangeHref("/finance", dateRange);
  const comparedLabel = t("comparedWithPreviousPeriod");
  const newResultLabel = t("newResult");
  const noChangeLabel = t("noChange");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <DirectionCard
        title={t("directionCars")}
        metricLabel={t("realizedProfit")}
        resultValue={formatCurrency(directions.cars.profit)}
        countLabel={t("soldVehicles")}
        countValue={formatNumber(directions.cars.soldCount)}
        comparison={comparisons.cars}
        comparedLabel={comparedLabel}
        newResultLabel={newResultLabel}
        noChangeLabel={noChangeLabel}
        tone="cars"
        href={financeHref}
      />
      <DirectionCard
        title={t("directionDetailing")}
        metricLabel={t("netResult")}
        resultValue={formatCurrency(directions.detailing.netResult)}
        countLabel={t("completedOrders")}
        countValue={formatNumber(directions.detailing.orderCount)}
        comparison={comparisons.detailing}
        comparedLabel={comparedLabel}
        newResultLabel={newResultLabel}
        noChangeLabel={noChangeLabel}
        tone="detailing"
        href={financeHref}
      />
      <DirectionCard
        title={t("directionDocuments")}
        metricLabel={t("profit")}
        resultValue={formatCurrency(directions.documents.profit)}
        countLabel={t("completedTasks")}
        countValue={formatNumber(directions.documents.completedCount)}
        comparison={comparisons.documents}
        comparedLabel={comparedLabel}
        newResultLabel={newResultLabel}
        noChangeLabel={noChangeLabel}
        tone="documents"
        href={financeHref}
      />
    </div>
  );
}
