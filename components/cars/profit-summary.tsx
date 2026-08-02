"use client";

import { useTranslations } from "next-intl";
import type { Car } from "@/lib/types/cars";
import {
  getFinanceSummaryRows,
  getFinanceSummaryTitleKey,
} from "@/lib/cars/business-rules";
import { DEFAULT_BUSINESS_MODEL } from "@/lib/constants/business-model";
import { getProfitToneClass } from "@/lib/cars/display-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateCommissionType } from "@/lib/i18n/business-model";
import { cn } from "@/lib/utils";

type ProfitSummaryProps = {
  car: Car;
  totalExpenses: number;
};

function ProfitRow({
  label,
  value,
  accent,
  toneClass,
}: {
  label: string;
  value: string;
  accent?: boolean;
  toneClass?: string;
}) {
  return (
    <div
      className={
        accent
          ? "flex justify-between gap-3 border-t border-zinc-800 pt-3"
          : "flex justify-between gap-3"
      }
    >
      <span className={accent ? "text-zinc-300" : "text-zinc-400"}>{label}</span>
      <span
        className={cn(
          accent ? "font-semibold tabular-nums" : "text-white tabular-nums",
          accent ? toneClass : undefined
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function ProfitSummary({ car, totalExpenses }: ProfitSummaryProps) {
  const model = car.business_model ?? DEFAULT_BUSINESS_MODEL;
  const rows = getFinanceSummaryRows(car, totalExpenses);

  const t = useTranslations("cars");
  const tFields = useTranslations("fields");
  const tCommissionType = useTranslations("commissionType");
  const { formatCurrency } = useFormatters();

  const title = t(getFinanceSummaryTitleKey(model));
  const estimatedLabel = tFields("estimated");

  function resolveLabel(labelKey: string) {
    if (labelKey === "projectedProfit" || labelKey === "finalProfit") {
      return t(labelKey as "projectedProfit" | "finalProfit");
    }
    return tFields(labelKey as never);
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {rows.map((row, index) => {
          const label = resolveLabel(row.labelKey);
          const formatted =
            row.amount == null
              ? "—"
              : row.isEstimate
                ? `${formatCurrency(row.amount)} (${estimatedLabel})`
                : formatCurrency(row.amount);
          const toneClass = row.accent
            ? getProfitToneClass(row.amount, row.isEstimate)
            : undefined;

          return (
            <div key={`${row.labelKey}-${index}`}>
              <ProfitRow
                label={label}
                value={formatted}
                accent={row.accent}
                toneClass={toneClass}
              />
              {row.hint === "commissionType" && car.commission_type ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {translateCommissionType(tCommissionType, car.commission_type)}
                  {car.commission_type === "percentage" && car.commission_value != null
                    ? `: ${car.commission_value}%`
                    : ""}
                </p>
              ) : null}
            </div>
          );
        })}
        {rows.some((row) => row.isEstimate) ? (
          <p className="text-xs text-zinc-500">{t("estimatedProfitHint")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
