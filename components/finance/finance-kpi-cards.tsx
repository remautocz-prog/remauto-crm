"use client";

import type { PeriodComparison } from "@/lib/finance/period-comparison";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type PrimaryKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  comparison?: PeriodComparison | null;
  comparisonLabel?: string;
  newResultLabel?: string;
  noChangeLabel?: string;
  formatCurrency: (value: number) => string;
  accent: "green" | "amber" | "blue" | "cyan" | "violet";
};

const PRIMARY_ACCENTS = {
  green: {
    card: "border-emerald-500/25 bg-gradient-to-br from-emerald-950/35 to-zinc-950/80 shadow-[0_0_24px_-8px_rgba(16,185,129,0.35)]",
    value: "text-emerald-300",
    glow: "from-emerald-500/10",
  },
  amber: {
    card: "border-amber-500/25 bg-gradient-to-br from-amber-950/30 to-zinc-950/80 shadow-[0_0_24px_-8px_rgba(245,158,11,0.28)]",
    value: "text-amber-300",
    glow: "from-amber-500/10",
  },
  blue: {
    card: "border-sky-500/25 bg-gradient-to-br from-sky-950/30 to-zinc-950/80 shadow-[0_0_24px_-8px_rgba(14,165,233,0.28)]",
    value: "text-sky-300",
    glow: "from-sky-500/10",
  },
  cyan: {
    card: "border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 to-zinc-950/80 shadow-[0_0_24px_-8px_rgba(34,211,238,0.28)]",
    value: "text-cyan-300",
    glow: "from-cyan-500/10",
  },
  violet: {
    card: "border-violet-500/25 bg-gradient-to-br from-violet-950/30 to-zinc-950/80 shadow-[0_0_24px_-8px_rgba(139,92,246,0.28)]",
    value: "text-violet-300",
    glow: "from-violet-500/10",
  },
} as const;

function ComparisonBadge({
  comparison,
  comparisonLabel,
  newResultLabel,
  noChangeLabel,
  formatCurrency,
}: {
  comparison: PeriodComparison;
  comparisonLabel: string;
  newResultLabel?: string;
  noChangeLabel?: string;
  formatCurrency: (value: number) => string;
}) {
  if (comparison.kind === "new_result") {
    return (
      <div className="mt-2">
        <span className="text-xs text-zinc-500">
          {newResultLabel ?? comparisonLabel}
        </span>
      </div>
    );
  }

  const positive = comparison.changePercent > 0;
  const unchanged = comparison.kind === "unchanged";

  return (
    <div className="mt-2 space-y-0.5">
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          unchanged
            ? "bg-zinc-800/60 text-zinc-400"
            : positive
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
        )}
      >
        {!unchanged ? (
          positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
          )
        ) : null}
        <span>
          {unchanged
            ? (noChangeLabel ?? "0%")
            : `${positive ? "+" : ""}${comparison.changePercent}%`}
        </span>
        {!unchanged ? (
          <span className="text-zinc-500">{comparisonLabel}</span>
        ) : null}
      </div>
      {!unchanged ? (
        <p className="text-xs text-zinc-500">
          {formatCurrency(comparison.previousValue)}
        </p>
      ) : null}
    </div>
  );
}

export function PrimaryKpiCard({
  label,
  value,
  hint,
  comparison,
  comparisonLabel,
  newResultLabel,
  noChangeLabel,
  formatCurrency,
  accent,
}: PrimaryKpiCardProps) {
  const styles = PRIMARY_ACCENTS[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5",
        styles.card
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent",
          styles.glow
        )}
      />
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl", styles.value)}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      {comparison && comparisonLabel ? (
        <ComparisonBadge
          comparison={comparison}
          comparisonLabel={comparisonLabel}
          newResultLabel={newResultLabel}
          noChangeLabel={noChangeLabel}
          formatCurrency={formatCurrency}
        />
      ) : null}
    </div>
  );
}

type OperatingMetricCardProps = {
  label: string;
  value: string;
  comparison?: PeriodComparison | null;
  comparisonLabel?: string;
  formatCurrency: (value: number) => string;
  accent: "blue" | "violet" | "red" | "cyan" | "amber";
};

const OPERATING_ACCENTS = {
  blue: "border-sky-500/20 bg-sky-950/15 text-sky-300",
  violet: "border-violet-500/20 bg-violet-950/15 text-violet-300",
  red: "border-red-500/20 bg-red-950/15 text-red-300",
  cyan: "border-cyan-500/20 bg-cyan-950/15 text-cyan-300",
  amber: "border-amber-500/20 bg-amber-950/15 text-amber-300",
} as const;

export function OperatingMetricCard({
  label,
  value,
  comparison,
  comparisonLabel,
  formatCurrency,
  accent,
}: OperatingMetricCardProps) {
  return (
    <div className={cn("rounded-lg border px-4 py-3", OPERATING_ACCENTS[accent])}>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
      {comparison && comparisonLabel ? (
        <ComparisonBadge
          comparison={comparison}
          comparisonLabel={comparisonLabel}
          formatCurrency={formatCurrency}
        />
      ) : null}
    </div>
  );
}

type ControlMetricCardProps = {
  label: string;
  value: string | number;
  accent: "red" | "amber" | "green";
};

const CONTROL_ACCENTS = {
  red: "border-red-500/20 bg-red-950/10 text-red-300",
  amber: "border-amber-500/20 bg-amber-950/10 text-amber-300",
  green: "border-emerald-500/20 bg-emerald-950/10 text-emerald-300",
} as const;

export function ControlMetricCard({ label, value, accent }: ControlMetricCardProps) {
  const valueColors = {
    red: "text-red-300",
    amber: "text-amber-300",
    green: "text-emerald-300",
  } as const;

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", CONTROL_ACCENTS[accent])}>
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", valueColors[accent])}>
        {value}
      </p>
    </div>
  );
}

export function FinanceSectionWarning({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
      {message}
    </p>
  );
}
