import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import {
  isTaskActiveForDeadline,
  isTaskDueToday,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import {
  isDateWithinPeriod,
  type DashboardPeriodBounds,
} from "@/lib/dashboard/period";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type DocumentWorkloadSummary = {
  inProgress: number;
  dueToday: number;
  overdue: number;
  completedThisPeriod: number;
};

export function computeDocumentWorkloadSummary(input: {
  tasks: DocumentTaskWithRelations[];
  today: string;
  bounds?: DashboardPeriodBounds;
}): DocumentWorkloadSummary {
  const { tasks, today, bounds } = input;
  let inProgress = 0;
  let dueToday = 0;
  let overdue = 0;
  let completedThisPeriod = 0;

  for (const task of tasks) {
    if (task.archived_at) continue;

    if (ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)) {
      inProgress += 1;
    }

    if (isTaskActiveForDeadline(task) && isTaskDueToday(task, today)) {
      dueToday += 1;
    }

    if (isTaskActiveForDeadline(task) && isTaskOverdue(task, today)) {
      overdue += 1;
    }

    if (
      COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never) &&
      task.completed_at &&
      (!bounds || isDateWithinPeriod(task.completed_at, bounds))
    ) {
      completedThisPeriod += 1;
    }
  }

  return { inProgress, dueToday, overdue, completedThisPeriod };
}
