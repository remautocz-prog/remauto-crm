"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Loader2 } from "lucide-react";
import { updateDocumentTaskDeadlineAction } from "@/lib/actions/documents";
import { DocumentDeadlineDisplay } from "@/components/documents/document-deadline-display";
import { DocumentDeadlineQuickPicks } from "@/components/documents/document-deadline-quick-picks";
import type { DocumentListToast } from "@/components/documents/document-inline-status-select";
import { Input } from "@/components/ui/input";
import type { DocumentTask } from "@/lib/types/documents";
import { cn } from "@/lib/utils";

type DocumentInlineDeadlineEditorProps = {
  taskId: number;
  task: Pick<DocumentTask, "due_date" | "deadline" | "status">;
  onDeadlineChange?: (taskId: number, dueDate: string | null) => void;
  onToast?: (toast: DocumentListToast) => void;
  className?: string;
};

export function DocumentInlineDeadlineEditor({
  taskId,
  task,
  onDeadlineChange,
  onToast,
  className,
}: DocumentInlineDeadlineEditorProps) {
  const [value, setValue] = useState(task.due_date ?? task.deadline ?? "");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("documents");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function saveDeadline(nextValue: string | null) {
    const normalized = nextValue?.trim() || null;
    const current = value.trim() || null;
    if (normalized === current) {
      setOpen(false);
      return;
    }

    const previous = value;
    setValue(normalized ?? "");
    setOpen(false);

    startTransition(async () => {
      const result = await updateDocumentTaskDeadlineAction(taskId, normalized);
      if (!result.success) {
        setValue(previous);
        onToast?.({ message: t("deadlineUpdateFailed"), type: "error" });
        return;
      }
      onDeadlineChange?.(taskId, normalized);
      onToast?.({ message: t("deadlineUpdated"), type: "success" });
    });
  }

  const displayTask = { ...task, due_date: value || null, deadline: null };

  return (
    <div ref={containerRef} className={cn("relative min-w-[8rem]", className)}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-left text-xs",
          isPending && "opacity-70"
        )}
        aria-label={t("deadline")}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <DocumentDeadlineDisplay task={displayTask} className="truncate text-xs" />
      </button>
      {isPending ? (
        <Loader2 className="absolute -right-5 top-1.5 h-3.5 w-3.5 animate-spin text-zinc-400" />
      ) : null}
      {open ? (
        <div className="absolute z-50 mt-1 w-72 rounded-md border border-zinc-700 bg-zinc-950 p-3 shadow-xl">
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mb-3 h-9 text-sm"
          />
          <DocumentDeadlineQuickPicks onSelect={saveDeadline} disabled={isPending} />
        </div>
      ) : null}
    </div>
  );
}
