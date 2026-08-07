"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { previousPeriodLabelKey } from "@/lib/finance/period-comparison";
import type { FinanceCenterData } from "@/lib/queries/finance-center";
import { DateRangeSelector } from "@/components/shared/date-range-selector";
import {
  ControlMetricCard,
  FinanceSectionWarning,
  PrimaryKpiCard,
} from "@/components/finance/finance-kpi-cards";
import { BusinessDirectionCards } from "@/components/finance/business-direction-cards";
import {
  FinanceDirectionChart,
  FinanceProfitTrendChart,
} from "@/components/finance/finance-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

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
                      : row.direction === "detailing"
                        ? t("directionDetailing")
                        : t("directionDocuments")}
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
  const dash = tCommon("dash");

  const formatShortDate = (value: string) =>
    formatDate(value, dash).replace(/\s/g, " ").slice(0, 6);

  const comparisonLabel = t(
    `comparedWith.${previousPeriodLabelKey(data.dateRange.preset)}` as never
  );

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
        <div className="w-full lg:max-w-2xl">
          <DateRangeSelector
            from={data.dateRange.from}
            to={data.dateRange.to}
            preset={data.dateRange.preset}
          />
        </div>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <PrimaryKpiCard
            label={t("combinedRealizedResult")}
            value={formatCurrency(data.combinedRealized)}
            comparison={data.errors.comparisons ? null : data.comparisons.realizedProfit}
            comparisonLabel={comparisonLabel}
            newResultLabel={t("newResult")}
            noChangeLabel={t("noChange")}
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
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {t("businessDirections")}
          </h2>
          <BusinessDirectionCards
            directions={data.businessDirections}
            formatCurrency={formatCurrency}
            formatNumber={(value) => String(value)}
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
            <CardTitle className="text-base text-white">{t("resultByDirection")}</CardTitle>
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

      <p className="text-xs text-zinc-500">
        {t("projectedProfitNote")}{" "}
        <Link href="/cars" className="text-red-400 hover:text-red-300">
          {t("viewCars")}
        </Link>
      </p>
    </div>
  );
}
