"use client";

import { useTranslations } from "next-intl";
import { DOCUMENT_PRIORITY_STYLES, normalizeDocumentPriority } from "@/lib/documents/priority-styles";
import { translateDocumentPriority } from "@/lib/i18n/documents";
import { cn } from "@/lib/utils";

export function DocumentPriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  const t = useTranslations("documents.priority");
  const normalized = normalizeDocumentPriority(priority);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        DOCUMENT_PRIORITY_STYLES[normalized],
        className
      )}
    >
      {translateDocumentPriority(t, normalized)}
    </span>
  );
}
