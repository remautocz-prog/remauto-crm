"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  DOCUMENT_PRIORITY_VALUES,
  type DocumentPriority,
} from "@/lib/constants/documents";
import { updateDocumentTaskPriorityAction } from "@/lib/actions/documents";
import {
  DOCUMENT_PRIORITY_SELECT_STYLES,
  normalizeDocumentPriority,
} from "@/lib/documents/priority-styles";
import { translateDocumentPriority } from "@/lib/i18n/documents";
import type { DocumentListToast } from "@/components/documents/document-inline-status-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DocumentInlinePrioritySelectProps = {
  taskId: number;
  priority: string;
  onPriorityChange?: (taskId: number, priority: DocumentPriority) => void;
  onToast?: (toast: DocumentListToast) => void;
  className?: string;
};

export function DocumentInlinePrioritySelect({
  taskId,
  priority,
  onPriorityChange,
  onToast,
  className,
}: DocumentInlinePrioritySelectProps) {
  const [value, setValue] = useState(() => normalizeDocumentPriority(priority));
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("documents");
  const tPriority = useTranslations("documents.priority");

  useEffect(() => {
    setValue(normalizeDocumentPriority(priority));
  }, [priority]);

  function handleChange(nextRaw: string) {
    const nextPriority = normalizeDocumentPriority(nextRaw);
    if (nextPriority === value) return;

    const previous = value;
    setValue(nextPriority);

    startTransition(async () => {
      const result = await updateDocumentTaskPriorityAction(taskId, nextPriority);
      if (!result.success) {
        setValue(previous);
        onToast?.({ message: t("priorityUpdateFailed"), type: "error" });
        return;
      }
      onPriorityChange?.(taskId, nextPriority);
      onToast?.({ message: t("priorityUpdated"), type: "success" });
    });
  }

  return (
    <div className={cn("relative inline-flex min-w-[7rem] items-center gap-2", className)}>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          className={cn(
            "h-8 border text-xs font-medium",
            DOCUMENT_PRIORITY_SELECT_STYLES[value],
            isPending && "opacity-70"
          )}
          aria-label={t("priorityLabel")}
        >
          <SelectValue>{translateDocumentPriority(tPriority, value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DOCUMENT_PRIORITY_VALUES.map((priorityOption) => (
            <SelectItem key={priorityOption} value={priorityOption}>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  DOCUMENT_PRIORITY_SELECT_STYLES[priorityOption]
                )}
              >
                {translateDocumentPriority(tPriority, priorityOption)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" aria-hidden />
      ) : null}
    </div>
  );
}
