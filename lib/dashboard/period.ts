import { getPragueTodayDateString } from "@/lib/documents/deadline";

export const DASHBOARD_PERIOD_VALUES = [
  "today",
  "week",
  "month",
  "year",
  "all",
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIOD_VALUES)[number];

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "month";

export type DashboardPeriodBounds = {
  start: string | null;
  end: string | null;
};

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const { year, month, day } = parseDateParts(date);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return formatUtcDate(next);
}

export function parseDashboardPeriod(value?: string | null): DashboardPeriod {
  if (value && DASHBOARD_PERIOD_VALUES.includes(value as DashboardPeriod)) {
    return value as DashboardPeriod;
  }
  return DEFAULT_DASHBOARD_PERIOD;
}

export function getDashboardPeriodBounds(
  period: DashboardPeriod,
  today = getPragueTodayDateString()
): DashboardPeriodBounds {
  if (period === "all") {
    return { start: null, end: null };
  }

  if (period === "today") {
    return { start: today, end: today };
  }

  if (period === "week") {
    const { year, month, day } = parseDateParts(today);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = date.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const start = addDays(today, mondayOffset);
    const end = addDays(start, 6);
    return { start, end };
  }

  if (period === "month") {
    const { year, month } = parseDateParts(today);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }

  const { year } = parseDateParts(today);
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function isDateWithinPeriod(
  value: string | null | undefined,
  bounds: DashboardPeriodBounds
) {
  if (!value) return false;
  if (!bounds.start || !bounds.end) return true;
  const date = value.slice(0, 10);
  return date >= bounds.start && date <= bounds.end;
}
