import type { DateRangePreset } from "@/lib/date-range/filter";
import {
  getDashboardPeriodBounds,
  type DashboardPeriod,
  type DashboardPeriodBounds,
} from "@/lib/dashboard/period";
import { getPragueTodayDateString } from "@/lib/documents/deadline";

export const FINANCE_PERIOD_VALUES = ["today", "week", "month"] as const;
export type FinancePeriod = (typeof FINANCE_PERIOD_VALUES)[number];

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function addDays(date: string, days: number) {
  const { year, month, day } = parseDateParts(date);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function parseFinanceCenterPeriod(value?: string | null): FinancePeriod {
  if (value && FINANCE_PERIOD_VALUES.includes(value as FinancePeriod)) {
    return value as FinancePeriod;
  }
  return "month";
}

export function getPreviousPeriodBounds(
  period: FinancePeriod,
  today = getPragueTodayDateString()
): DashboardPeriodBounds | null {
  if (period === "today") {
    const yesterday = addDays(today, -1);
    return { start: yesterday, end: yesterday };
  }

  if (period === "week") {
    const current = getDashboardPeriodBounds("week", today);
    if (!current.start) return null;
    const previousEnd = addDays(current.start, -1);
    const previousStart = addDays(previousEnd, -6);
    return { start: previousStart, end: previousEnd };
  }

  const { year, month } = parseDateParts(today);
  const previousMonthAnchor = new Date(Date.UTC(year, month - 2, 1));
  const previousYear = previousMonthAnchor.getUTCFullYear();
  const previousMonth = previousMonthAnchor.getUTCMonth() + 1;
  const start = `${previousYear}-${String(previousMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(previousYear, previousMonth, 0)).getUTCDate();
  const end = `${previousYear}-${String(previousMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export type PeriodComparison =
  | {
      kind: "percent";
      previousValue: number;
      changePercent: number;
    }
  | {
      kind: "unchanged";
      previousValue: number;
      changePercent: 0;
    }
  | {
      kind: "new_result";
      previousValue: 0;
    };

export function buildPeriodComparison(
  currentValue: number,
  previousValue: number
): PeriodComparison | null {
  if (previousValue === 0 && currentValue === 0) {
    return null;
  }

  if (previousValue === 0) {
    return { kind: "new_result", previousValue: 0 };
  }

  const changePercent =
    Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10;

  if (changePercent === 0) {
    return { kind: "unchanged", previousValue, changePercent: 0 };
  }

  return { previousValue, changePercent, kind: "percent" };
}

export function previousPeriodLabelKey(
  period: FinancePeriod | DateRangePreset
): "previousDay" | "previousWeek" | "previousMonth" | "previousYear" | "previousPeriod" {
  if (period === "today") return "previousDay";
  if (period === "week") return "previousWeek";
  if (period === "year") return "previousYear";
  if (period === "custom") return "previousPeriod";
  return "previousMonth";
}
