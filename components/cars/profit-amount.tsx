"use client";

import { cn } from "@/lib/utils";
import { getProfitToneClass } from "@/lib/cars/display-helpers";

type ProfitAmountProps = {
  amount: number | null | undefined;
  isEstimate?: boolean;
  formatCurrency: (value: number) => string;
  estimatedLabel: string;
  dash: string;
  className?: string;
};

export function ProfitAmount({
  amount,
  isEstimate,
  formatCurrency,
  estimatedLabel,
  dash,
  className,
}: ProfitAmountProps) {
  if (amount == null || Number.isNaN(amount)) {
    return <span className={cn("text-zinc-500", className)}>{dash}</span>;
  }

  const formatted = formatCurrency(amount);
  const value =
    isEstimate && amount !== 0 ? `${formatted} (${estimatedLabel})` : formatted;

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        getProfitToneClass(amount, isEstimate),
        className
      )}
    >
      {value}
    </span>
  );
}
