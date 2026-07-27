"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import type { Profile } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { DocumentDeadlineDisplay } from "@/components/documents/document-deadline-display";
import { DocumentInlineAssigneeSelect } from "@/components/documents/document-inline-assignee-select";
import { DocumentInlinePrioritySelect } from "@/components/documents/document-inline-priority-select";
import {
  DocumentInlineStatusSelect,
  type DocumentListToast,
} from "@/components/documents/document-inline-status-select";
import { DocumentQuickPayControl } from "@/components/documents/document-quick-pay-control";
import { Button } from "@/components/ui/button";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DashboardTodaysWorkProps = {
  tasks: DocumentTaskWithRelations[];
  profiles: Profile[];
  error?: string;
};

export function DashboardTodaysWork({
  tasks,
  profiles,
  error,
}: DashboardTodaysWorkProps) {
  const t = useTranslations("dashboard");
  const tDocuments = useTranslations("documents");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  const dash = tCommon("dash");
  const [toast, setToast] = useState<DocumentListToast | null>(null);

  function showToast(next: DocumentListToast) {
    setToast(next);
    window.setTimeout(() => setToast(null), 3000);
    router.refresh();
  }

  if (error) {
    return (
      <section
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6"
        aria-labelledby="dashboard-todays-work-error-heading"
      >
        <h2
          id="dashboard-todays-work-error-heading"
          className="text-lg font-semibold tracking-tight text-white sm:text-xl"
        >
          {t("todaysWork")}
        </h2>
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-red-200">{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => router.refresh()}>
                {t("retry")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (tasks.length === 0) {
    return (
      <section
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6"
        aria-labelledby="dashboard-todays-work-empty-heading"
      >
        <h2
          id="dashboard-todays-work-empty-heading"
          className="text-lg font-semibold tracking-tight text-white sm:text-xl"
        >
          {t("todaysWork")}
        </h2>
        <p className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">
          {t("noTodaysWork")}
        </p>
      </section>
    );
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-4 sm:p-6"
      aria-labelledby="dashboard-todays-work-heading"
    >
      <div className="border-b border-zinc-800/80 pb-3">
        <h2
          id="dashboard-todays-work-heading"
          className="text-lg font-semibold tracking-tight text-white sm:text-xl"
        >
          {t("todaysWork")}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">{t("todaysWorkHint")}</p>
      </div>

      {toast ? (
        <p
          className={`rounded-md px-3 py-2 text-xs ${
            toast.type === "success"
              ? "bg-green-950/40 text-green-300"
              : "bg-red-950/40 text-red-300"
          }`}
          role="status"
        >
          {toast.message}
        </p>
      ) : null}

      <div className="space-y-3">
        {tasks.map((task) => {
          const finance = getDocumentFinanceSummary(task);
          const clientName = task.client
            ? getClientDisplayName(task.client)
            : tDocuments("taskFallback", { id: task.id });
          const vehicleTitle = getDocumentVehicleTitle(task, task.car, dash);
          const serviceCount = finance.serviceCount;

          return (
            <article
              key={task.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-white">{clientName}</p>
                  <p className="truncate text-sm text-zinc-500">{vehicleTitle}</p>
                  <p className="text-xs text-zinc-500">
                    {t("servicesCount", { count: serviceCount })}
                    {" · "}
                    {formatCurrency(finance.outstandingBalance)}
                  </p>
                </div>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="shrink-0 self-start border-zinc-700"
                >
                  <Link href={`/documents/${task.id}`}>{t("openOrderDetails")}</Link>
                </Button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
                <DocumentInlineStatusSelect
                  key={`status-${task.id}-${task.status}`}
                  taskId={task.id}
                  status={task.status}
                  onToast={showToast}
                  className="w-full sm:w-auto"
                />
                <DocumentInlinePrioritySelect
                  key={`priority-${task.id}-${task.priority}`}
                  taskId={task.id}
                  priority={task.priority}
                  onToast={showToast}
                  className="w-full sm:w-auto"
                />
                <DocumentInlineAssigneeSelect
                  key={`assignee-${task.id}-${task.assigned_to ?? "none"}`}
                  taskId={task.id}
                  assignedTo={task.assigned_to}
                  assigneeName={task.assignee?.full_name ?? null}
                  profiles={profiles}
                  onToast={showToast}
                  className="w-full sm:w-auto"
                />
                <DocumentDeadlineDisplay task={task} />
                <DocumentQuickPayControl task={task} compact />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
