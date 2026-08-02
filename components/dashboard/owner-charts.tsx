"use client";

import type { ProfitDirectionBar, ProfitTrendPoint } from "@/lib/dashboard/owner-chart-metrics";
import { cn } from "@/lib/utils";

type OwnerProfitTrendChartProps = {
  data: ProfitTrendPoint[];
  formatCurrency: (value: number) => string;
  formatShortDate: (value: string) => string;
  emptyLabel: string;
};

export function OwnerProfitTrendChart({
  data,
  formatCurrency,
  formatShortDate,
  emptyLabel,
}: OwnerProfitTrendChartProps) {
  const width = 320;
  const height = 140;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return (
      <p className="flex h-36 items-center justify-center text-sm text-zinc-500">
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
  const firstLabel = data[0]?.date;
  const lastLabel = data[data.length - 1]?.date;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-36 w-full"
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
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{firstLabel ? formatShortDate(firstLabel) : ""}</span>
        <span className="tabular-nums text-zinc-300">
          {formatCurrency(lastPoint?.profit ?? 0)}
        </span>
        <span>{lastLabel ? formatShortDate(lastLabel) : ""}</span>
      </div>
    </div>
  );
}

type OwnerProfitDirectionChartProps = {
  data: ProfitDirectionBar[];
  labels: Record<ProfitDirectionBar["labelKey"], string>;
  formatCurrency: (value: number) => string;
  emptyLabel: string;
};

const BAR_COLORS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-cyan-500",
];

export function OwnerProfitDirectionChart({
  data,
  labels,
  formatCurrency,
  emptyLabel,
}: OwnerProfitDirectionChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-36 items-center justify-center text-sm text-zinc-500">
        {emptyLabel}
      </p>
    );
  }

  const maxAbs = Math.max(...data.map((bar) => Math.abs(bar.profit)), 1);

  return (
    <div className="space-y-3">
      {data.map((bar, index) => {
        const widthPercent = Math.max(4, (Math.abs(bar.profit) / maxAbs) * 100);
        const negative = bar.profit < 0;

        return (
          <div key={bar.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-zinc-400">{labels[bar.labelKey]}</span>
              <span
                className={cn(
                  "shrink-0 tabular-nums font-medium",
                  negative ? "text-red-300" : "text-zinc-200"
                )}
              >
                {formatCurrency(bar.profit)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  negative ? "bg-red-500/70" : BAR_COLORS[index % BAR_COLORS.length]
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
