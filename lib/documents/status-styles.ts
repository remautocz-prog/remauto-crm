import type { DocumentTaskStatus } from "@/lib/constants/documents";

/** Badge / select styling per document task status. */
export const DOCUMENT_STATUS_STYLES: Record<DocumentTaskStatus, string> = {
  NEW: "bg-zinc-500/20 text-zinc-300",
  IN_PROGRESS: "bg-yellow-500/15 text-yellow-300",
  WAITING_CLIENT: "bg-blue-500/15 text-blue-300",
  WAITING_OFFICE: "bg-purple-500/15 text-purple-300",
  COMPLETED: "bg-green-500/15 text-green-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};

export const DOCUMENT_STATUS_SELECT_STYLES: Record<DocumentTaskStatus, string> = {
  NEW: "border-zinc-600 bg-zinc-800/80 text-zinc-300",
  IN_PROGRESS: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
  WAITING_CLIENT: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  WAITING_OFFICE: "border-purple-500/40 bg-purple-500/10 text-purple-200",
  COMPLETED: "border-green-500/40 bg-green-500/10 text-green-200",
  DELIVERED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  CANCELLED: "border-red-500/40 bg-red-500/10 text-red-200",
};
