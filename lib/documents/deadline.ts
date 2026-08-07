import { TERMINAL_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import type { DocumentTask } from "@/lib/types/documents";

export const PRAGUE_TIMEZONE = "Europe/Prague";

export type DeadlineState = "overdue" | "due_today" | "upcoming" | "no_deadline";

export function getTaskDueDate(
  task: Pick<DocumentTask, "due_date" | "deadline">
): string | null {
  return task.due_date ?? task.deadline ?? null;
}

export function getPragueTodayDateString(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PRAGUE_TIMEZONE }).format(reference);
}

export function addDaysToPragueDate(days: number, fromDate?: string): string {
  const base = fromDate ?? getPragueTodayDateString();
  const [year, month, day] = base.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getPragueWeekEndDateString(today = getPragueTodayDateString()): string {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const daysUntilSunday = weekday === 0 ? 0 : 7 - weekday;
  date.setUTCDate(date.getUTCDate() + daysUntilSunday);
  return date.toISOString().slice(0, 10);
}

export function isTaskActiveForDeadline(
  task: Pick<DocumentTask, "status">
): boolean {
  return !TERMINAL_DOCUMENT_TASK_STATUSES.includes(task.status as never);
}

export function getDeadlineState(
  task: Pick<DocumentTask, "due_date" | "deadline" | "status">,
  today = getPragueTodayDateString()
): DeadlineState {
  const due = getTaskDueDate(task);
  if (!due || !isTaskActiveForDeadline(task)) {
    return due && !isTaskActiveForDeadline(task) ? "upcoming" : "no_deadline";
  }
  if (due < today) return "overdue";
  if (due === today) return "due_today";
  return "upcoming";
}

export function compareDeadlineNearest(
  a: Pick<DocumentTask, "due_date" | "deadline" | "status">,
  b: Pick<DocumentTask, "due_date" | "deadline" | "status">,
  today = getPragueTodayDateString()
): number {
  const rank = (task: Pick<DocumentTask, "due_date" | "deadline" | "status">) => {
    const state = getDeadlineState(task, today);
    switch (state) {
      case "overdue":
        return 0;
      case "due_today":
        return 1;
      case "upcoming":
        return 2;
      default:
        return 3;
    }
  };

  const aRank = rank(a);
  const bRank = rank(b);
  if (aRank !== bRank) return aRank - bRank;

  const aDue = getTaskDueDate(a);
  const bDue = getTaskDueDate(b);
  if (!aDue && !bDue) return 0;
  if (!aDue) return 1;
  if (!bDue) return -1;
  return aDue.localeCompare(bDue);
}

export function compareDeadlineLatest(
  a: Pick<DocumentTask, "due_date" | "deadline">,
  b: Pick<DocumentTask, "due_date" | "deadline">
): number {
  const aDue = getTaskDueDate(a);
  const bDue = getTaskDueDate(b);
  if (!aDue && !bDue) return 0;
  if (!aDue) return 1;
  if (!bDue) return -1;
  return bDue.localeCompare(aDue);
}

export function getOverdueDayCount(
  task: Pick<DocumentTask, "due_date" | "deadline" | "status">,
  today = getPragueTodayDateString()
): number {
  const due = getTaskDueDate(task);
  if (!due || !isTaskActiveForDeadline(task) || due >= today) {
    return 0;
  }

  const [dueYear, dueMonth, dueDay] = due.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const dueMs = Date.UTC(dueYear, dueMonth - 1, dueDay);
  const todayMs = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.floor((todayMs - dueMs) / 86_400_000);
}

export const DEADLINE_STATE_STYLES: Record<DeadlineState, string> = {
  overdue: "text-red-400 font-medium",
  due_today: "text-orange-400 font-medium",
  upcoming: "text-sky-300",
  no_deadline: "text-zinc-500",
};
