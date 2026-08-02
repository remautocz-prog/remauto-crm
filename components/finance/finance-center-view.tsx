"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FINANCE_PERIOD_VALUES,
  previousPeriodLabelKey,
  type FinancePeriod,
} from "@/lib/finance/period-comparison";
import type { FinanceCenterData } from "@/lib/queries/finance-center";
import {
  ControlMetricCard,
  FinanceSectionWarning,
  OperatingMetricCard,
  PrimaryKpiCard,
} from "@/components/finance/finance-kpi-cards";
import {
  FinanceDirectionChart,
  FinanceProfitTrendChart,
} from "@/components/finance/finance-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type FinanceCenterViewProps = {
  data: FinanceCenterData;
};

function TopProfitSourcesSection({
  data,
  formatCurrency,
  t,
}: {
  data: FinanceCenterData;
  formatCurrency: (value: number) => string;
  t: ReturnType<typeof useTranslations<"finance">>;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white">{t("topProfitSources")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.errors.topSources ? (
          <FinanceSectionWarning message={t("sectionLoadFailed")} />
        ) : data.topProfitSources.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noTopSources")}</p>
        ) : (
          <ul className="space-y-2">
            {data.topProfitSources.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">{row.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {row.direction === "cars"
                      ? t("directionCars")
                      : t("directionDetailing")}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {formatCurrency(row.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ExpenseBreakdownSection({
  data,
  formatCurrency,
  t,
  tVehicleExpenseCat,
  tDetailingCat,
}: {
  data: FinanceCenterData;
  formatCurrency: (value: number) => string;
  t: ReturnType<typeof useTranslations<"finance">>;
  tVehicleExpenseCat: ReturnType<typeof useTranslations<"expenseCategories">>;
  tDetailingCat: ReturnType<typeof useTranslations<"detailing">>;
}) {
  const labelFor = (source: "vehicle" | "detailing", category: string) => {
    const categoryLabel =
      source === "vehicle"
        ? tVehicleExpenseCat(category as never)
        : tDetailingCat(`expenseCategories.${category}` as never);
    const sourceLabel =
      source === "vehicle" ? t("vehicleExpenses") : t("detailingExpenses");
    return `${sourceLabel} · ${categoryLabel}`;
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white">{t("expenseBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.errors.expenseBreakdown ? (
          <FinanceSectionWarning message={t("sectionLoadFailed")} />
        ) : data.expenseBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noExpenseBreakdown")}</p>
        ) : (
          <ul className="space-y-2">
            {data.expenseBreakdown.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {labelFor(row.source, row.category)}
                  </p>
                  <p className="text-xs text-zinc-500">{t("shareOfExpenses")}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-white">
                    {formatCurrency(row.amount)}
                  </p>
                  <p className="text-xs text-zinc-500">{row.sharePercent}%</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function FinanceCenterView({ data }: FinanceCenterViewProps) {
  const t = useTranslations("finance");
  const tVehicleExpenseCat = useTranslations("expenseCategories");
  const tDetailingCat = useTranslations("detailing");
  const tCommon = useTranslations("common");
  const { formatCurrency, formatDate } = useFormatters();
  const router = useRouter();
  const dash = tCommon("dash");

  const formatShortDate = (value: string) =>
    formatDate(value, dash).replace(/\s/g, " ").slice(0, 6);

  const comparisonLabel = t(`comparedWith.${previousPeriodLabelKey(data.period)}` as never);

  function setPeriod(period: FinancePeriod) {
    router.push(`/finance?period=${period}`);
  }

  if (data.errors.core) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <FinanceSectionWarning message={t("coreLoadFailed")} />
      </div>
    );
  }

  const directionChartData = data.directionSummary.map((bar) => ({
    id: bar.id,
    label: t(bar.labelKey),
    profit: bar.profit,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t("unifiedDescription")}</p>
        </div>
        <div
          className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1"
          role="tablist"
          aria-label={t("periodSelector")}
        >
          {FINANCE_PERIOD_VALUES.map((period) => (
            <button
              key={period}
              type="button"
              role="tab"
              aria-selected={data.period === period}
              onClick={() => setPeriod(period)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                data.period === period
                  ? "bg-red-600/80 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {t(`period.${period}` as never)}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("primaryIndicators")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PrimaryKpiCard
            label={t("realizedProfit")}
            value={formatCurrency(data.combinedRealized)}
            comparison={data.errors.comparisons ? null : data.comparisons.realizedProfit}
            comparisonLabel={comparisonLabel}
            formatCurrency={formatCurrency}
            accent="green"
          />
          <PrimaryKpiCard
            label={t("projectedProfit")}
            value={formatCurrency(data.cars.projectedProfit)}
            hint={t("currentInventoryProjection")}
            formatCurrency={formatCurrency}
            accent="amber"
          />
          <PrimaryKpiCard
            label={t("carsRealizedProfit")}
            value={formatCurrency(data.cars.realizedProfit)}
            formatCurrency={formatCurrency}
            accent="blue"
          />
          <PrimaryKpiCard
            label={t("detailingNetResult")}
            value={formatCurrency(data.detailing.netResult)}
            comparison={data.errors.comparisons ? null : data.comparisons.detailingNetResult}
            comparisonLabel={comparisonLabel}
            formatCurrency={formatCurrency}
            accent="cyan"
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("operatingIndicators")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatingMetricCard
            label={t("detailingRevenue")}
            value={formatCurrency(data.detailing.revenue)}
            comparison={data.errors.comparisons ? null : data.comparisons.detailingRevenue}
            comparisonLabel={comparisonLabel}
            formatCurrency={formatCurrency}
            accent="blue"
          />
          <OperatingMetricCard
            label={t("detailingCommissions")}
            value={formatCurrency(data.detailing.commissions)}
            formatCurrency={formatCurrency}
            accent="violet"
          />
          <OperatingMetricCard
            label={t("detailingExpenses")}
            value={formatCurrency(data.detailing.expenses)}
            comparison={data.errors.comparisons ? null : data.comparisons.detailingExpenses}
            comparisonLabel={comparisonLabel}
            formatCurrency={formatCurrency}
            accent="red"
          />
          <OperatingMetricCard
            label={t("documentsInProgress")}
            value={String(data.documentsWorkload.inProgress)}
            formatCurrency={formatCurrency}
            accent="cyan"
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("controlIndicators")}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
          <ControlMetricCard
            label={t("documentsDueToday")}
            value={data.documentsWorkload.dueToday}
            accent="amber"
          />
          <ControlMetricCard
            label={t("documentsOverdue")}
            value={data.documentsWorkload.overdue}
            accent="red"
          />
          <ControlMetricCard
            label={t("documentsCompleted")}
            value={data.documentsWorkload.completedThisPeriod}
            accent="green"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">{t("realizedProfitTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.errors.charts ? (
              <FinanceSectionWarning message={t("sectionLoadFailed")} />
            ) : (
              <FinanceProfitTrendChart
                data={data.profitTrend}
                formatCurrency={formatCurrency}
                formatShortDate={formatShortDate}
                emptyLabel={t("noChartData")}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">{t("realizedResult")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.errors.charts ? (
              <FinanceSectionWarning message={t("sectionLoadFailed")} />
            ) : (
              <FinanceDirectionChart
                data={directionChartData}
                formatCurrency={formatCurrency}
                emptyLabel={t("noChartData")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopProfitSourcesSection data={data} formatCurrency={formatCurrency} t={t} />
        <ExpenseBreakdownSection
          data={data}
          formatCurrency={formatCurrency}
          t={t}
          tVehicleExpenseCat={tVehicleExpenseCat}
          tDetailingCat={tDetailingCat}
        />
      </div>

      {data.documentsProfit != null ? (
        <p className="text-xs text-zinc-500">
          {t("documentsRealizedProfit")}: {formatCurrency(data.documentsProfit)}
        </p>
      ) : (
        <p className="text-xs text-zinc-500">{t("documentsNoIncome")}</p>
      )}

      <p className="text-xs text-zinc-500">
        {t("projectedProfitNote")}{" "}
        <Link href="/cars" className="text-red-400 hover:text-red-300">
          {t("viewCars")}
        </Link>
      </p>
    </div>
  );
}
