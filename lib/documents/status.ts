import {
  DOCUMENT_TASK_STATUS_VALUES,
  type DocumentTaskStatus,
} from "@/lib/constants/documents";

const LEGACY_STATUS_MAP: Record<string, DocumentTaskStatus> = {
  new: "NEW",
  in_progress: "IN_PROGRESS",
  waiting_client: "WAITING_CLIENT",
  waiting_authority: "WAITING_OFFICE",
  waiting_office: "WAITING_OFFICE",
  completed: "COMPLETED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  open: "NEW",
  pending: "NEW",
  active: "IN_PROGRESS",
};

/** Normalizes DB/form status values to the canonical uppercase enum. */
export function normalizeDocumentTaskStatus(
  value: string | null | undefined
): DocumentTaskStatus {
  if (!value) return "NEW";

  if (DOCUMENT_TASK_STATUS_VALUES.includes(value as DocumentTaskStatus)) {
    return value as DocumentTaskStatus;
  }

  const legacy = LEGACY_STATUS_MAP[value.toLowerCase()];
  if (legacy) return legacy;

  const upper = value.toUpperCase();
  if (DOCUMENT_TASK_STATUS_VALUES.includes(upper as DocumentTaskStatus)) {
    return upper as DocumentTaskStatus;
  }

  return "NEW";
}

export function isDocumentTaskStatus(value: string): value is DocumentTaskStatus {
  return DOCUMENT_TASK_STATUS_VALUES.includes(value as DocumentTaskStatus);
}
