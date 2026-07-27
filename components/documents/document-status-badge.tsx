"use client";

import { useTranslations } from "next-intl";
import type { DocumentTaskStatus } from "@/lib/constants/documents";
import { DOCUMENT_STATUS_STYLES } from "@/lib/documents/status-styles";
import { translateDocumentStatus } from "@/lib/i18n/documents";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { cn } from "@/lib/utils";

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
        DOCUMENT_STATUS_STYLES[normalized] ?? "bg-zinc-700/60 text-zinc-300",
        className
      )}
    >
      {translateDocumentStatus(t, normalized)}
    </span>
  );
}
