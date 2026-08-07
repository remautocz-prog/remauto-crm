import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import type { DocumentTask } from "@/lib/types/documents";
import { isTaskArchived } from "@/lib/documents/helpers";

export const DOCUMENT_LIST_SEGMENTS = ["active", "completed", "archived"] as const;

export type DocumentListSegment = (typeof DOCUMENT_LIST_SEGMENTS)[number];

export function parseDocumentListSegment(input?: {
  segment?: string | null;
  archived?: boolean | string | null;
}): DocumentListSegment {
  const raw = input?.segment?.trim().toLowerCase();
  if (raw === "active" || raw === "completed" || raw === "archived") {
    return raw;
  }
  if (input?.archived === true || input?.archived === "1" || input?.archived === "true") {
    return "archived";
  }
  return "active";
}

export function isTaskInListSegment(
  task: DocumentTask,
  segment: DocumentListSegment
): boolean {
  if (segment === "archived") {
    return isTaskArchived(task);
  }

  if (isTaskArchived(task)) {
    return false;
  }

  if (segment === "completed") {
    return COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never);
  }

  return ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never);
}

export function segmentUsesKanban(segment: DocumentListSegment): boolean {
  return segment === "active";
}
