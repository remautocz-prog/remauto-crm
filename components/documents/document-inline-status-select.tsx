"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  DOCUMENT_TASK_STATUS_VALUES,
  type DocumentTaskStatus,
} from "@/lib/constants/documents";
import { changeDocumentStatusAction } from "@/lib/actions/documents";
import { DOCUMENT_STATUS_SELECT_STYLES } from "@/lib/documents/status-styles";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { translateDocumentStatus } from "@/lib/i18n/documents";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DocumentStatusToast = {
  message: string;
  type: "success" | "error";
};

type DocumentInlineStatusSelectProps = {
  taskId: number;
  status: string;
  onStatusChange?: (taskId: number, status: DocumentTaskStatus) => void;
  onToast?: (toast: DocumentStatusToast) => void;
  className?: string;
};

export function DocumentInlineStatusSelect({
  taskId,
  status,
  onStatusChange,
  onToast,
  className,
}: DocumentInlineStatusSelectProps) {
  const [value, setValue] = useState(() => normalizeDocumentTaskStatus(status));
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("documents");
  const tStatus = useTranslations("documents.status");

  useEffect(() => {
    setValue(normalizeDocumentTaskStatus(status));
  }, [status]);

  function handleChange(nextRaw: string) {
    const nextStatus = normalizeDocumentTaskStatus(nextRaw);
    if (nextStatus === value) return;

    const previous = value;
    setValue(nextStatus);

    startTransition(async () => {
      const result = await changeDocumentStatusAction(taskId, { status: nextStatus });
      if (!result.success) {
        setValue(previous);
        onToast?.({ message: result.error, type: "error" });
        return;
      }
      onStatusChange?.(taskId, nextStatus);
      onToast?.({ message: t("statusUpdatedSuccess"), type: "success" });
    });
  }

  return (
    <div className={cn("relative inline-flex min-w-[10rem] items-center gap-2", className)}>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          className={cn(
            "h-8 border text-xs font-medium",
            DOCUMENT_STATUS_SELECT_STYLES[value],
            isPending && "opacity-70"
          )}
          aria-label={t("changeStatus")}
        >
          <SelectValue>{translateDocumentStatus(tStatus, value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DOCUMENT_TASK_STATUS_VALUES.map((statusOption) => (
            <SelectItem key={statusOption} value={statusOption}>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  DOCUMENT_STATUS_SELECT_STYLES[statusOption]
                )}
              >
                {translateDocumentStatus(tStatus, statusOption)}
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
