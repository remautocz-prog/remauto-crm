"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { KANBAN_DOCUMENT_STATUSES } from "@/lib/constants/documents";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getTaskDueDate, isTaskOverdue } from "@/lib/documents/helpers";
import { changeDocumentStatusAction } from "@/lib/actions/documents";
import { DocumentPriorityBadge } from "@/components/documents/document-priority-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { bindDocumentServiceTranslator, translateDocumentService, translateDocumentStatus } from "@/lib/i18n/documents";

type DocumentsKanbanProps = {
  tasks: DocumentTaskWithRelations[];
};

export function DocumentsKanban({ tasks }: DocumentsKanbanProps) {
  const t = useTranslations("documents");
  const tServices = useTranslations("documents.services");
  const tStatus = useTranslations("documents.status");
  const { formatDate } = useFormatters();

  const grouped = KANBAN_DOCUMENT_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-4 2xl:grid-cols-7">
      {grouped.map(({ status, tasks: columnTasks }) => (
        <Card key={status} className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white">
              {translateDocumentStatus(tStatus, status)} ({columnTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {columnTasks.length === 0 ? (
              <p className="text-xs text-zinc-500">{t("kanbanEmpty")}</p>
            ) : (
              columnTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  tServices={(key) => tServices(key as never)}
                  formatDate={formatDate}
                />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanCard({
  task,
  tServices,
  formatDate,
}: {
  task: DocumentTaskWithRelations;
  tServices: (key: string) => string;
  formatDate: (value: string | null | undefined, dash?: string) => string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("documents");
  const tStatus = useTranslations("documents.status");

  const serviceLabel =
    task.service_type === "custom"
      ? task.custom_service_name ?? tServices("custom")
      : task.service_type
        ? translateDocumentService(bindDocumentServiceTranslator(tServices as (key: never) => string), task.service_type)
        : "—";

  function moveToStatus(status: string) {
    startTransition(async () => {
      const result = await changeDocumentStatusAction(task.id, { status });
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <Link href={`/documents/${task.id}`} className="font-medium text-white hover:text-red-400">
        #{task.id}
      </Link>
      <p className="mt-1 text-sm text-zinc-300">{serviceLabel}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {task.client ? getClientDisplayName(task.client) : "—"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <DocumentPriorityBadge priority={task.priority} />
        {isTaskOverdue(task) ? (
          <span className="text-xs text-red-400">{t("overdue")}</span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {formatDate(getTaskDueDate(task), "—")}
      </p>
      <div className="mt-3">
        <Select value={task.status} onValueChange={moveToStatus} disabled={isPending}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KANBAN_DOCUMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {translateDocumentStatus(tStatus, status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
