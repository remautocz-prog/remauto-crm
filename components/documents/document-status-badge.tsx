"use client";

import { useTranslations } from "next-intl";
import type { DocumentTaskStatus } from "@/lib/constants/documents";
import { translateDocumentStatus } from "@/lib/i18n/documents";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<DocumentTaskStatus, string> = {
  NEW: "bg-zinc-700/60 text-zinc-300",
  IN_PROGRESS: "bg-blue-500/15 text-blue-300",
  WAITING_CLIENT: "bg-amber-500/15 text-amber-300",
  WAITING_OFFICE: "bg-purple-500/15 text-purple-300",
  COMPLETED: "bg-green-500/15 text-green-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useTranslations("documents.status");
  const normalized = normalizeDocumentTaskStatus(status);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[normalized] ?? "bg-zinc-700/60 text-zinc-300",
        className
      )}
    >
      {translateDocumentStatus(t, normalized)}
    </span>
  );
}
