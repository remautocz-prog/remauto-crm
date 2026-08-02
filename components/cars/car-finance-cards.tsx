"use client";

import { useTranslations } from "next-intl";
import type { Car } from "@/lib/types/cars";
import {
  calculateCarProfit,
  getFinanceSummaryRows,
  resolveSaleBasePrice,
} from "@/lib/cars/business-rules";
import { DEFAULT_BUSINESS_MODEL } from "@/lib/constants/business-model";
import {
  getProfitLabelKey,
  getProfitToneClass,
  resolveActualSalePrice,
} from "@/lib/cars/display-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type CarFinanceCardsProps = {
  car: Car;
  totalExpenses: number;
};

function FinanceCard({
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
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <p
          className={cn(
            "mt-2 text-lg font-semibold tabular-nums",
            accent ? toneClass : "text-white"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function CarFinanceCards({ car, totalExpenses }: CarFinanceCardsProps) {
  const t = useTranslations("cars");
  const tFields = useTranslations("fields");
  const { formatCurrency } = useFormatters();
  const dash = "—";
  const estimatedLabel = tFields("estimated");
  const model = car.business_model ?? DEFAULT_BUSINESS_MODEL;

  function formatAmount(amount: number | null | undefined, isEstimate?: boolean) {
    if (amount == null || Number.isNaN(amount)) return dash;
    const formatted = formatCurrency(amount);
    return isEstimate ? `${formatted} (${estimatedLabel})` : formatted;
  }

  if (model === "owned") {
    const profit = calculateCarProfit(car, totalExpenses);
    const saleBase = resolveSaleBasePrice(car);
    const actualSale = resolveActualSalePrice(car);
    const profitLabelKey = getProfitLabelKey(car);

    const cards = [
      {
        label: tFields("purchasePrice"),
        value:
          car.purchase_price != null
            ? formatCurrency(Number(car.purchase_price))
            : dash,
      },
      {
        label: tFields("plannedSalePrice"),
        value:
          car.sale_price != null
            ? formatCurrency(Number(car.sale_price))
            : saleBase.price > 0
              ? formatAmount(saleBase.price, saleBase.isEstimate)
              : dash,
      },
      {
        label: tFields("actualSalePrice"),
        value: actualSale != null ? formatCurrency(actualSale) : dash,
      },
      {
        label: tFields("totalExpenses"),
        value: formatCurrency(totalExpenses),
      },
      {
        label: t(profitLabelKey),
        value: formatAmount(profit.netProfit, profit.isEstimate),
        accent: true,
        toneClass: getProfitToneClass(profit.netProfit, profit.isEstimate),
      },
    ];

    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <FinanceCard key={card.label} {...card} />
        ))}
      </div>
    );
  }

  const rows = getFinanceSummaryRows(car, totalExpenses);
  const cards = rows
    .filter((row) => row.labelKey !== "sale")
    .map((row) => {
      const label =
        row.labelKey === "projectedProfit" || row.labelKey === "finalProfit"
          ? t(row.labelKey)
          : tFields(row.labelKey);
      const value = formatAmount(row.amount, row.isEstimate);
      return {
        label,
        value,
        accent: row.accent,
        toneClass: row.accent
          ? getProfitToneClass(row.amount, row.isEstimate)
          : undefined,
      };
    });

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <FinanceCard key={card.label} {...card} />
      ))}
    </div>
  );
}
