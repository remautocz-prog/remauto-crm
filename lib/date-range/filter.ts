import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
import { getPragueTodayDateString } from "@/lib/documents/deadline";

export type DateRangePreset = "today" | "week" | "month" | "year" | "custom";

export type DateRangeFilter = {
  from: string;
  to: string;
  preset: DateRangePreset;
};

export type ResolvedDateRange = DateRangeFilter & {
  bounds: DashboardPeriodBounds;
  dayCount: number;
};

export type ChartGranularity = "day" | "week" | "month";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function diffDaysInclusive(from: string, to: string) {
  const start = parseDateParts(from);
  const end = parseDateParts(to);
  const startMs = Date.UTC(start.year, start.month - 1, start.day);
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}

function isValidDateString(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const { year, month, day } = parseDateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function getPresetDateRange(
  preset: Exclude<DateRangePreset, "custom">,
  today = getPragueTodayDateString()
): DateRangeFilter {
  if (preset === "today") {
    return { from: today, to: today, preset };
  }

  if (preset === "week") {
    const { year, month, day } = parseDateParts(today);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = date.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const from = addDays(today, mondayOffset);
    const to = addDays(from, 6);
    return { from, to, preset };
  }

  if (preset === "month") {
    const { year, month } = parseDateParts(today);
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { from, to, preset };
  }

  const { year } = parseDateParts(today);
  return { from: `${year}-01-01`, to: `${year}-12-31`, preset: "year" };
}

export function getDefaultDateRange(today = getPragueTodayDateString()): DateRangeFilter {
  return getPresetDateRange("month", today);
}

export function normalizeDateRange(
  from: string,
  to: string
): DateRangeFilter | null {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    return null;
  }
  if (from > to) {
    return null;
  }
  return { from, to, preset: "custom" };
}

export function parseDateRangeSearchParams(input: {
  from?: string | null;
  to?: string | null;
  preset?: string | null;
  period?: string | null;
}): ResolvedDateRange {
  const today = getPragueTodayDateString();

  if (isValidDateString(input.from) && isValidDateString(input.to)) {
    const normalized = normalizeDateRange(input.from, input.to);
    if (normalized) {
      return resolveDateRange(normalized);
    }
  }

  const presetCandidate = (input.preset ?? input.period ?? "month") as string;
  const presetValues: DateRangePreset[] = ["today", "week", "month", "year", "custom"];
  const preset = presetValues.includes(presetCandidate as DateRangePreset)
    ? (presetCandidate as DateRangePreset)
    : "month";

  if (preset === "custom") {
    return resolveDateRange(getDefaultDateRange(today));
  }

  return resolveDateRange(getPresetDateRange(preset, today));
}

export function resolveDateRange(range: DateRangeFilter): ResolvedDateRange {
  const dayCount = diffDaysInclusive(range.from, range.to);
  return {
    ...range,
    bounds: { start: range.from, end: range.to },
    dayCount,
  };
}

export function getPreviousComparableRange(
  range: DateRangeFilter
): DateRangeFilter | null {
  const dayCount = diffDaysInclusive(range.from, range.to);
  const previousEnd = addDays(range.from, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));
  return {
    from: previousStart,
    to: previousEnd,
    preset: "custom",
  };
}

export function buildDateRangeHref(
  path: string,
  range: Pick<DateRangeFilter, "from" | "to" | "preset">
): string {
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  if (range.preset !== "custom") {
    params.set("preset", range.preset);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getChartGranularity(dayCount: number): ChartGranularity {
  if (dayCount <= 31) return "day";
  if (dayCount <= 180) return "week";
  return "month";
}

export function buildChartBucketKeys(
  from: string,
  to: string,
  granularity: ChartGranularity
): string[] {
  if (granularity === "day") {
    const keys: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      keys.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return keys;
  }

  if (granularity === "week") {
    const keys: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      keys.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return keys;
  }

  const keys: string[] = [];
  const start = parseDateParts(from);
  const end = parseDateParts(to);
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}-01`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

export function bucketDateForChart(
  date: string,
  granularity: ChartGranularity
): string | null {
  if (!isValidDateString(date)) return null;
  if (granularity === "day") return date;

  if (granularity === "week") {
    const { year, month, day } = parseDateParts(date);
    const utc = new Date(Date.UTC(year, month - 1, day));
    const weekday = utc.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    return addDays(date, mondayOffset);
  }

  const { year, month } = parseDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function isDateWithinRange(
  value: string | null | undefined,
  from: string,
  to: string
) {
  if (!value) return false;
  const date = value.slice(0, 10);
  return date >= from && date <= to;
}

export function startOfLocalDayIso(date: string) {
  return `${date}T00:00:00.000Z`;
}

export function endOfLocalDayIso(date: string) {
  return `${date}T23:59:59.999Z`;
}
