"use client";

import { useTranslations } from "next-intl";
import {
  DEADLINE_STATE_STYLES,
  getDeadlineState,
  isTaskActiveForDeadline,
  type DeadlineState,
} from "@/lib/documents/deadline";
import type { DocumentTask } from "@/lib/types/documents";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type DocumentDeadlineDisplayProps = {
  task: Pick<DocumentTask, "due_date" | "deadline" | "status">;
  showStateLabel?: boolean;
  className?: string;
};

function getStateLabelKey(state: DeadlineState) {
  switch (state) {
    case "overdue":
      return "overdue";
    case "due_today":
      return "dueToday";
    case "upcoming":
      return "upcoming";
    default:
      return "noDeadline";
  }
}

export function DocumentDeadlineDisplay({
  task,
  showStateLabel = false,
  className,
}: DocumentDeadlineDisplayProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const dash = tCommon("dash");
  const dueDate = task.due_date ?? task.deadline ?? null;
  const active = isTaskActiveForDeadline(task);
  const state = active ? getDeadlineState(task) : "no_deadline";
  const stateLabel = t(getStateLabelKey(state));

  if (!dueDate) {
    return (
      <span className={cn(DEADLINE_STATE_STYLES.no_deadline, className)}>
        {showStateLabel ? stateLabel : dash}
      </span>
    );
  }

  return (
    <span className={cn(DEADLINE_STATE_STYLES[state], className)}>
      {formatDate(dueDate, dash)}
      {showStateLabel && active ? ` · ${stateLabel}` : null}
    </span>
  );
}
