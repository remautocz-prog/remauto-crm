import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import { isDateWithinRange, type ResolvedDateRange } from "@/lib/date-range/filter";
import {
  addDaysToPragueDate,
  compareDeadlineNearest,
  getOverdueDayCount,
  getPragueTodayDateString,
  getTaskDueDate,
} from "@/lib/documents/deadline";
import {
  hasMissingRequiredDocuments,
  isTaskActiveForDeadline,
  isTaskDueToday,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import { comparePriority } from "@/lib/documents/priority-styles";
import type {
  DocumentEmployeeDashboardData,
  DocumentEmployeeDashboardKpis,
  DocumentTask,
  DocumentTaskWithRelations,
} from "@/lib/types/documents";

export type DocumentEmployeeDashboardFocus =
  | "all"
  | "active"
  | "due_in_period"
  | "overdue"
  | "completed";

const ATTENTION_VISIBLE_LIMIT = 12;

export function isActiveEmployeeDashboardTask(task: DocumentTask): boolean {
  return (
    !task.archived_at &&
    ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

export function isTaskDueTomorrow(
  task: DocumentTask,
  today = getPragueTodayDateString()
): boolean {
  if (!isTaskActiveForDeadline(task)) return false;
  const due = getTaskDueDate(task);
  if (!due) return false;
  return due === addDaysToPragueDate(1, today);
}

export function isTaskCompletedInPeriod(
  task: DocumentTask,
  from: string,
  to: string
): boolean {
  if (!COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)) {
    return false;
  }
  if (!task.completed_at) return false;
  return isDateWithinRange(task.completed_at.slice(0, 10), from, to);
}

export function isTaskDueInPeriod(
  task: DocumentTask,
  from: string,
  to: string,
  today = getPragueTodayDateString()
): boolean {
  if (!isActiveEmployeeDashboardTask(task)) return false;
  const due = getTaskDueDate(task);
  if (!due) return false;
  return isDateWithinRange(due, from, to);
}

export function isHighPriorityTask(task: DocumentTask): boolean {
  return task.priority === "high" || task.priority === "urgent";
}

function taskMatchesEmployeeScope(
  task: DocumentTask,
  employeeId: string | null
): boolean {
  if (!employeeId) return true;
  return task.assigned_to === employeeId;
}

function scopedTasks(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null
) {
  return tasks.filter((task) => taskMatchesEmployeeScope(task, employeeId));
}

export function compareEmployeeDashboardTasks(
  a: DocumentTaskWithRelations,
  b: DocumentTaskWithRelations,
  today = getPragueTodayDateString()
): number {
  const overdueDiff =
    Number(isTaskOverdue(b, today)) - Number(isTaskOverdue(a, today));
  if (overdueDiff !== 0) return overdueDiff;

  const dueTodayDiff =
    Number(isTaskDueToday(b, today)) - Number(isTaskDueToday(a, today));
  if (dueTodayDiff !== 0) return dueTodayDiff;

  const priorityDiff = comparePriority(a.priority, b.priority, "high_first");
  if (priorityDiff !== 0) return priorityDiff;

  return compareDeadlineNearest(a, b, today);
}

function getAttentionRank(
  task: DocumentTask,
  today: string,
  from: string,
  to: string
): number {
  if (isTaskOverdue(task, today)) return 0;
  if (isTaskDueToday(task, today)) return 1;
  if (isTaskDueTomorrow(task, today)) return 2;

  const due = getTaskDueDate(task);
  if (
    due &&
    isDateWithinRange(due, from, to) &&
    isHighPriorityTask(task) &&
    isTaskActiveForDeadline(task)
  ) {
    return 3;
  }

  if (due && isDateWithinRange(due, from, to) && isTaskActiveForDeadline(task)) {
    return 4;
  }

  if (hasMissingRequiredDocuments(task) && isActiveEmployeeDashboardTask(task)) {
    return 5;
  }

  return 99;
}

function buildKpis(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null,
  period: ResolvedDateRange,
  today: string
): DocumentEmployeeDashboardKpis {
  const scoped = scopedTasks(tasks, employeeId);
  const scopedActive = scoped.filter(isActiveEmployeeDashboardTask);

  return {
    myActive: scopedActive.length,
    dueInPeriod: scopedActive.filter((task) =>
      isTaskDueInPeriod(task, period.from, period.to, today)
    ).length,
    overdue: scopedActive.filter((task) => isTaskOverdue(task, today)).length,
    completedInPeriod: scoped.filter((task) =>
      isTaskCompletedInPeriod(task, period.from, period.to)
    ).length,
    createdInPeriod: scoped.filter((task) =>
      isDateWithinRange(task.created_at.slice(0, 10), period.from, period.to)
    ).length,
  };
}

function buildNeedsAttention(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null,
  period: ResolvedDateRange,
  today: string
) {
  const candidates = scopedTasks(tasks, employeeId).filter(
    (task) =>
      isActiveEmployeeDashboardTask(task) &&
      getAttentionRank(task, today, period.from, period.to) < 99
  );

  const overdueTotal = candidates.filter((task) => isTaskOverdue(task, today)).length;

  const sorted = [...candidates].sort((a, b) => {
    const rankDiff =
      getAttentionRank(a, today, period.from, period.to) -
      getAttentionRank(b, today, period.from, period.to);
    if (rankDiff !== 0) return rankDiff;
    if (isTaskOverdue(a, today)) {
      return getOverdueDayCount(b, today) - getOverdueDayCount(a, today);
    }
    return compareEmployeeDashboardTasks(a, b, today);
  });

  const visible = sorted.slice(0, ATTENTION_VISIBLE_LIMIT);
  const visibleOverdue = visible.filter((task) => isTaskOverdue(task, today)).length;

  return {
    items: visible,
    overdueTotal,
    hasMoreOverdue: overdueTotal > visibleOverdue,
  };
}

function buildTodayTasks(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null,
  today: string
): DocumentTaskWithRelations[] {
  return scopedTasks(tasks, employeeId)
    .filter(
      (task) =>
        isActiveEmployeeDashboardTask(task) &&
        (isTaskOverdue(task, today) || isTaskDueToday(task, today))
    )
    .sort((a, b) => compareEmployeeDashboardTasks(a, b, today));
}

function buildUpcomingGroups(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null,
  period: ResolvedDateRange,
  today: string
) {
  const tomorrow = addDaysToPragueDate(1, today);

  const upcoming = scopedTasks(tasks, employeeId)
    .filter((task) => {
      if (!isActiveEmployeeDashboardTask(task)) return false;
      if (isTaskOverdue(task, today)) return false;
      const due = getTaskDueDate(task);
      if (!due) return false;
      return isDateWithinRange(due, period.from, period.to);
    })
    .sort((a, b) => compareEmployeeDashboardTasks(a, b, today));

  return {
    today: upcoming.filter((task) => getTaskDueDate(task) === today),
    tomorrow: upcoming.filter((task) => getTaskDueDate(task) === tomorrow),
    nextSevenDays: upcoming.filter((task) => {
      const due = getTaskDueDate(task);
      return Boolean(due && due > tomorrow);
    }),
  };
}

function buildActiveTasks(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null,
  today: string,
  limit = 10
): DocumentTaskWithRelations[] {
  return scopedTasks(tasks, employeeId)
    .filter(isActiveEmployeeDashboardTask)
    .sort((a, b) => compareEmployeeDashboardTasks(a, b, today))
    .slice(0, limit);
}

function buildRecentlyCompleted(
  tasks: DocumentTaskWithRelations[],
  employeeId: string | null,
  period: ResolvedDateRange,
  limit = 5
): DocumentTaskWithRelations[] {
  return scopedTasks(tasks, employeeId)
    .filter((task) => isTaskCompletedInPeriod(task, period.from, period.to))
    .sort((a, b) => {
      const aCompleted = a.completed_at ?? "";
      const bCompleted = b.completed_at ?? "";
      return bCompleted.localeCompare(aCompleted);
    })
    .slice(0, limit);
}

export function getDocumentEmployeeDashboardSummary(input: {
  tasks: DocumentTaskWithRelations[];
  employeeId: string | null;
  employeeName: string;
  viewerName: string;
  canSelectEmployee: boolean;
  assigneeOptions: Array<{ id: string; full_name: string }>;
  dateRange: ResolvedDateRange;
  today?: string;
}): DocumentEmployeeDashboardData {
  const today = input.today ?? getPragueTodayDateString();
  const attention = buildNeedsAttention(
    input.tasks,
    input.employeeId,
    input.dateRange,
    today
  );

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    viewerName: input.viewerName,
    today,
    dateRange: {
      from: input.dateRange.from,
      to: input.dateRange.to,
      preset: input.dateRange.preset,
    },
    canSelectEmployee: input.canSelectEmployee,
    assigneeOptions: input.assigneeOptions,
    kpis: buildKpis(input.tasks, input.employeeId, input.dateRange, today),
    needsAttention: attention.items,
    overdueAttentionTotal: attention.overdueTotal,
    hasMoreOverdueAttention: attention.hasMoreOverdue,
    todayTasks: buildTodayTasks(input.tasks, input.employeeId, today),
    upcomingDeadlines: buildUpcomingGroups(
      input.tasks,
      input.employeeId,
      input.dateRange,
      today
    ),
    activeTasks: buildActiveTasks(input.tasks, input.employeeId, today),
    recentlyCompleted: buildRecentlyCompleted(
      input.tasks,
      input.employeeId,
      input.dateRange
    ),
  };
}
