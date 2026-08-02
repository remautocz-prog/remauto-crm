"use client";

import type { ProfitTrendPoint } from "@/lib/dashboard/owner-chart-metrics";
import { cn } from "@/lib/utils";

type FinanceProfitTrendChartProps = {
  data: ProfitTrendPoint[];
  formatCurrency: (value: number) => string;
  formatShortDate: (value: string) => string;
  emptyLabel: string;
};

export function FinanceProfitTrendChart({
  data,
  formatCurrency,
  formatShortDate,
  emptyLabel,
}: FinanceProfitTrendChartProps) {
  const width = 320;
  const height = 175;
  const padding = { top: 12, right: 8, bottom: 28, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return (
      <p className="flex h-[11.25rem] items-center justify-center text-sm text-zinc-500">
        {emptyLabel}
      </p>
    );
  }

  const values = data.map((point) => point.profit);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x =
      padding.left +
      (data.length <= 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
    const y =
      padding.top + innerHeight - ((point.profit - minValue) / range) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const baselineY =
    padding.top + innerHeight - ((0 - minValue) / range) * innerHeight;

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding.left} ${baselineY} L ${points[0]?.x ?? padding.left} ${baselineY} Z`;

  const lastPoint = points[points.length - 1];
  const labelStep = data.length <= 7 ? 1 : Math.ceil(data.length / 5);
  const axisLabels = data.filter((_, index) => index % labelStep === 0 || index === data.length - 1);

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[11.25rem] w-full"
        role="img"
        aria-hidden
      >
        <line
          x1={padding.left}
          y1={baselineY}
          x2={width - padding.right}
          y2={baselineY}
          stroke="rgb(63 63 70 / 0.6)"
          strokeDasharray="4 4"
        />
        <path d={areaPath} fill="rgb(16 185 129 / 0.12)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgb(52 211 153)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {lastPoint ? (
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="rgb(110 231 183)" />
        ) : null}
      </svg>
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
          {axisLabels.map((point) => (
            <span key={point.date} className="shrink-0">
              {formatShortDate(point.date)}
            </span>
          ))}
        </div>
        <span className="shrink-0 tabular-nums text-zinc-300">
          {formatCurrency(lastPoint?.profit ?? 0)}
        </span>
      </div>
    </div>
  );
}

type FinanceDirectionChartProps = {
  data: { id: string; label: string; profit: number }[];
  formatCurrency: (value: number) => string;
  emptyLabel: string;
};

const BAR_COLORS: Record<string, string> = {
  cars: "bg-sky-500",
  detailing: "bg-cyan-500",
  documents: "bg-violet-500",
};

export function FinanceDirectionChart({
  data,
  formatCurrency,
  emptyLabel,
}: FinanceDirectionChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-[11.25rem] items-center justify-center text-sm text-zinc-500">
        {emptyLabel}
      </p>
    );
  }

  const maxAbs = Math.max(...data.map((bar) => Math.abs(bar.profit)), 1);

  return (
    <div className="space-y-4">
      {data.map((bar) => {
        const widthPercent = Math.max(4, (Math.abs(bar.profit) / maxAbs) * 100);
        const negative = bar.profit < 0;

        return (
          <div key={bar.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-300">{bar.label}</span>
              <span
                className={cn(
                  "shrink-0 tabular-nums text-sm font-semibold",
                  negative ? "text-red-300" : "text-zinc-100"
                )}
              >
                {formatCurrency(bar.profit)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  negative ? "bg-red-500/70" : BAR_COLORS[bar.id] ?? "bg-zinc-500"
                )}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
