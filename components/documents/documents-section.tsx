"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { getTaskDueDate } from "@/lib/documents/helpers";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { bindDocumentServiceTranslator, translateDocumentService } from "@/lib/i18n/documents";

type DocumentsSectionProps = {
  title: string;
  tasks: DocumentTaskWithRelations[];
  createHref: string;
  emptyMessage: string;
  compact?: boolean;
};

export function DocumentsSection({
  title,
  tasks,
  createHref,
  emptyMessage,
  compact = false,
}: DocumentsSectionProps) {
  const t = useTranslations("documents");
  const tFields = useTranslations("fields");
  const tServices = useTranslations("documents.services");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const dash = tCommon("dash");

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base text-white">{title}</CardTitle>
        <Button asChild size="sm" variant="ghost">
          <Link href={createHref}>
            <Plus className="h-4 w-4" />
            {t("createTask")}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-400">{emptyMessage}</p>
        ) : compact ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="pb-2 font-medium">{tFields("service")}</th>
                  <th className="pb-2 font-medium">{tFields("status")}</th>
                  <th className="pb-2 font-medium">{t("dueDate")}</th>
                  <th className="pb-2 font-medium">{tFields("manager")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-zinc-800/80">
                    <td className="py-2">
                      <Link href={`/documents/${task.id}`} className="text-white hover:text-red-400">
                        {task.service_type === "custom"
                          ? task.custom_service_name ?? tServices("custom")
                          : task.service_type
                            ? translateDocumentService(bindDocumentServiceTranslator(tServices as (key: never) => string), task.service_type)
                            : `#${task.id}`}
                      </Link>
                    </td>
                    <td className="py-2">
                      <DocumentStatusBadge status={task.status} />
                    </td>
                    <td className="py-2 text-zinc-300">
                      {formatDate(getTaskDueDate(task), dash)}
                    </td>
                    <td className="py-2 text-zinc-300">
                      {task.assignee?.full_name ?? t("unassigned")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 last:border-0">
                <div>
                  <Link href={`/documents/${task.id}`} className="font-medium text-white hover:text-red-400">
                    #{task.id}
                  </Link>
                  <div className="mt-1">
                    <DocumentStatusBadge status={task.status} />
                  </div>
                </div>
                <span className="text-sm text-zinc-400">
                  {formatDate(getTaskDueDate(task), dash)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
