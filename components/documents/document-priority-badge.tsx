"use client";

import { useTranslations } from "next-intl";
import { translateDocumentPriority } from "@/lib/i18n/documents";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-zinc-700/60 text-zinc-300",
  normal: "bg-zinc-700/60 text-zinc-300",
  high: "bg-orange-500/15 text-orange-300",
  urgent: "bg-red-500/15 text-red-300",
};

export function DocumentPriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  const t = useTranslations("documents.priority");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        PRIORITY_STYLES[priority] ?? "bg-zinc-700/60 text-zinc-300",
        className
      )}
    >
      {translateDocumentPriority(t, priority)}
    </span>
  );
}
