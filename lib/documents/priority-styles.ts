import type { DocumentPriority } from "@/lib/constants/documents";
import { DEFAULT_DOCUMENT_PRIORITY } from "@/lib/constants/documents";

/** Badge styling per document task priority. */
export const DOCUMENT_PRIORITY_STYLES: Record<DocumentPriority, string> = {
  low: "bg-green-500/15 text-green-300",
  normal: "bg-zinc-500/20 text-zinc-300",
  high: "bg-orange-500/15 text-orange-300",
  urgent: "bg-red-500/15 text-red-300",
};

export const DOCUMENT_PRIORITY_SELECT_STYLES: Record<DocumentPriority, string> = {
  low: "border-green-500/40 bg-green-500/10 text-green-200",
  normal: "border-zinc-600 bg-zinc-800/80 text-zinc-300",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  urgent: "border-red-500/40 bg-red-500/10 text-red-200",
};

export const DOCUMENT_PRIORITY_ROW_ACCENT: Partial<Record<DocumentPriority, string>> = {
  urgent: "border-l-2 border-l-red-500/40",
};

export const PRIORITY_SORT_RANK: Record<DocumentPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function normalizeDocumentPriority(
  value: string | null | undefined
): DocumentPriority {
  if (value === "low" || value === "normal" || value === "high" || value === "urgent") {
    return value;
  }
  return DEFAULT_DOCUMENT_PRIORITY;
}

export function comparePriority(a: string, b: string, direction: "high_first" | "low_first") {
  const rankA = PRIORITY_SORT_RANK[normalizeDocumentPriority(a)];
  const rankB = PRIORITY_SORT_RANK[normalizeDocumentPriority(b)];
  return direction === "high_first" ? rankA - rankB : rankB - rankA;
}
