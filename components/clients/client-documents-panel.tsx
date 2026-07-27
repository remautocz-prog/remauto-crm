"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { TERMINAL_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { isTaskOverdue } from "@/lib/documents/helpers";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { DocumentDeadlineDisplay } from "@/components/documents/document-deadline-display";
import { DocumentPaymentStatusBadge } from "@/components/documents/document-payment-status-badge";
import { DocumentPriorityBadge } from "@/components/documents/document-priority-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type DocumentFilter = "all" | "active" | "completed" | "unpaid" | "overdue";

type ClientDocumentsPanelProps = {
  clientId: number;
  tasks: DocumentTaskWithRelations[];
  onCreateOrder: () => void;
};

export function ClientDocumentsPanel({
  clientId,
  tasks,
  onCreateOrder,
}: ClientDocumentsPanelProps) {
  const [filter, setFilter] = useState<DocumentFilter>("active");
  const t = useTranslations("clients");
  const tDocuments = useTranslations("documents");
  const tCommon = useTranslations("common");
  const { formatCurrency } = useFormatters();
  const dash = tCommon("dash");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const finance = getDocumentFinanceSummary(task);
      const isTerminal = TERMINAL_DOCUMENT_TASK_STATUSES.includes(task.status as never);
      switch (filter) {
        case "active":
          return !isTerminal && !task.archived_at;
        case "completed":
          return isTerminal;
        case "unpaid":
          return finance.outstandingBalance > 0;
        case "overdue":
          return isTaskOverdue(task);
        default:
          return true;
      }
    });
  }, [tasks, filter]);

  const filters: Array<{ id: DocumentFilter; label: string }> = [
    { id: "active", label: t("filterActive") },
    { id: "completed", label: t("filterCompleted") },
    { id: "unpaid", label: t("filterUnpaid") },
    { id: "overdue", label: t("filterOverdue") },
    { id: "all", label: t("filterAll") },
  ];

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base text-white">{t("documentsTitle")}</CardTitle>
        <Button size="sm" onClick={onCreateOrder}>
          <Plus className="h-4 w-4" />
          {t("createDocumentOrderForClient")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "secondary"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("noDocumentOrders")}</p>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const finance = getDocumentFinanceSummary(task);
              return (
                <div
                  key={task.id}
                  className="rounded-lg border border-zinc-800/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/documents/${task.id}`}
                        className="font-medium text-white hover:text-red-400"
                      >
                        #{task.id}
                      </Link>
                      <p className="mt-1 text-sm text-zinc-400">
                        {getDocumentVehicleTitle(task, task.car, dash)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DocumentStatusBadge status={task.status} />
                      <DocumentPriorityBadge priority={task.priority} />
                      <DocumentPaymentStatusBadge status={finance.paymentStatus} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-3 sm:block">
                      <span className="text-zinc-500">{tDocuments("servicesTitle")}</span>
                      <span className="text-zinc-200">{finance.serviceCount}</span>
                    </div>
                    <div className="flex justify-between gap-3 sm:block">
                      <span className="text-zinc-500">{tDocuments("totalPrice")}</span>
                      <span className="text-zinc-200">{formatCurrency(finance.servicePrice)}</span>
                    </div>
                    <div className="flex justify-between gap-3 sm:block">
                      <span className="text-zinc-500">{tDocuments("paidAmount")}</span>
                      <span className="text-zinc-200">{formatCurrency(finance.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-3 sm:block">
                      <span className="text-zinc-500">{tDocuments("debt")}</span>
                      <span className={cn(finance.outstandingBalance > 0 && "text-orange-400")}>
                        {formatCurrency(finance.outstandingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 sm:block">
                      <span className="text-zinc-500">{tDocuments("responsibleEmployee")}</span>
                      <span className="text-zinc-200">
                        {task.assignee?.full_name ?? tDocuments("unassigned")}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 sm:block">
                      <span className="text-zinc-500">{tDocuments("deadline")}</span>
                      <DocumentDeadlineDisplay task={task} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
