"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Plus } from "lucide-react";
import { DateRangeSelector } from "@/components/shared/date-range-selector";
import type { ClientOption, Profile } from "@/lib/types/cars";
import type { DocumentEmployeeDashboardFocus } from "@/lib/documents/employee-dashboard";
import type {
  DocumentEmployeeDashboardData,
  DocumentTaskWithRelations,
} from "@/lib/types/documents";
import type { DocumentCarOption } from "@/lib/documents/vehicle";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getOverdueDayCount } from "@/lib/documents/deadline";
import {
  getTaskServiceLabel,
  hasMissingRequiredDocuments,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import {
  bindDocumentServiceTranslator,
  translateDocumentService,
} from "@/lib/i18n/documents";
import { DocumentDeadlineDisplay } from "@/components/documents/document-deadline-display";
import {
  DocumentInlineStatusSelect,
  type DocumentListToast,
} from "@/components/documents/document-inline-status-select";
import { DocumentPriorityBadge } from "@/components/documents/document-priority-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentTaskFormDialog } from "@/components/documents/document-task-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type DocumentsEmployeeDashboardProps = {
  data: DocumentEmployeeDashboardData;
  selectedEmployee: string;
  clients: ClientOption[];
  cars: DocumentCarOption[];
  profiles: Profile[];
  initialFocus?: DocumentEmployeeDashboardFocus;
};

function getTaskTitle(
  task: DocumentTaskWithRelations,
  fallback: (id: number) => string
) {
  if (task.client) {
    return getClientDisplayName(task.client);
  }
  return fallback(task.id);
}

function KpiCard({
  label,
  value,
  href,
  tone = "default",
  active = false,
  onClick,
  hint,
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "warning" | "success";
  active?: boolean;
  onClick?: () => void;
  hint?: string;
}) {
  const toneClasses = {
    default: "border-zinc-800 bg-zinc-900/70",
    warning: "border-red-900/60 bg-red-950/20",
    success: "border-emerald-900/40 bg-emerald-950/10",
  }[tone];

  const content = (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        toneClasses,
        active && "ring-1 ring-red-500/40",
        (href || onClick) && "hover:border-zinc-700"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tabular-nums",
          tone === "warning" ? "text-red-400" : "text-white"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

function TaskMetaRow({
  task,
  serviceLabel,
  vehicleLabel,
}: {
  task: DocumentTaskWithRelations;
  serviceLabel: string;
  vehicleLabel: string;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
      {serviceLabel ? <span>{serviceLabel}</span> : null}
      {vehicleLabel ? <span>{vehicleLabel}</span> : null}
      {hasMissingRequiredDocuments(task) ? (
        <span className="text-amber-400">!</span>
      ) : null}
    </div>
  );
}

export function DocumentsEmployeeDashboard({
  data,
  selectedEmployee,
  clients,
  cars,
  profiles,
  initialFocus = "all",
}: DocumentsEmployeeDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("documents.employeeDashboard");
  const tDocuments = useTranslations("documents");
  const tFields = useTranslations("fields");
  const tServices = useTranslations("documents.services");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const dash = tCommon("dash");

  const [focus, setFocus] = useState<DocumentEmployeeDashboardFocus>(initialFocus);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<DocumentListToast | null>(null);
  const [, startRefresh] = useTransition();

  const translateService = useMemo(
    () => bindDocumentServiceTranslator(tServices),
    [tServices]
  );

  function handleEmployeeChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("employee");
    } else {
      params.set("employee", value);
    }
    const query = params.toString();
    router.push(query ? `/documents/dashboard?${query}` : "/documents/dashboard");
  }

  function handleStatusChange() {
    startRefresh(() => {
      router.refresh();
    });
  }

  function getServiceLabel(task: DocumentTaskWithRelations) {
    const code = getTaskServiceLabel(task);
    return code ? translateDocumentService(translateService, code) : dash;
  }

  function getVehicleLabel(task: DocumentTaskWithRelations) {
    return getDocumentVehicleTitle(task, task.car, dash);
  }

  function renderAttentionRow(task: DocumentTaskWithRelations) {
    const overdueDays = getOverdueDayCount(task, data.today);
    const title = getTaskTitle(task, (id) => tDocuments("taskFallback", { id }));

    return (
      <div
        key={task.id}
        className={cn(
          "rounded-lg border px-4 py-3",
          isTaskOverdue(task, data.today)
            ? "border-red-900/50 bg-red-950/10"
            : "border-zinc-800/80 bg-zinc-950/40"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href={`/documents/${task.id}`}
              className="font-medium text-white hover:text-red-400"
            >
              {title}
            </Link>
            <TaskMetaRow
              task={task}
              serviceLabel={getServiceLabel(task)}
              vehicleLabel={getVehicleLabel(task)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <DocumentDeadlineDisplay task={task} showStateLabel />
              <DocumentPriorityBadge priority={task.priority} />
              <DocumentStatusBadge status={task.status} />
              {overdueDays > 0 ? (
                <span className="font-medium text-red-400">
                  {t("overdueByDays", { days: overdueDays })}
                </span>
              ) : null}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/documents/${task.id}`}>{t("open")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  function renderTodayRow(task: DocumentTaskWithRelations) {
    const title = getTaskTitle(task, (id) => tDocuments("taskFallback", { id }));

    return (
      <div
        key={task.id}
        className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-4 py-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href={`/documents/${task.id}`}
              className="font-medium text-white hover:text-red-400"
            >
              {title}
            </Link>
            <TaskMetaRow
              task={task}
              serviceLabel={getServiceLabel(task)}
              vehicleLabel={getVehicleLabel(task)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <DocumentDeadlineDisplay task={task} showStateLabel />
              <DocumentPriorityBadge priority={task.priority} />
            </div>
          </div>
          <DocumentInlineStatusSelect
            taskId={task.id}
            status={task.status}
            onStatusChange={handleStatusChange}
            onToast={setToast}
          />
        </div>
      </div>
    );
  }

  function renderCompactTaskRow(task: DocumentTaskWithRelations) {
    const title = getTaskTitle(task, (id) => tDocuments("taskFallback", { id }));

    return (
      <Link
        key={task.id}
        href={`/documents/${task.id}`}
        className="block rounded-lg border border-zinc-800/70 px-3 py-2 hover:border-zinc-700"
      >
        <p className="font-medium text-zinc-100">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{getVehicleLabel(task)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <DocumentDeadlineDisplay task={task} />
          <DocumentPriorityBadge priority={task.priority} />
        </div>
      </Link>
    );
  }

  function renderActiveTableRow(task: DocumentTaskWithRelations) {
    const title = getTaskTitle(task, (id) => tDocuments("taskFallback", { id }));

    return (
      <tr key={task.id} className="border-t border-zinc-800/80">
        <td className="py-3 pr-3 align-top">
          <DocumentPriorityBadge priority={task.priority} />
        </td>
        <td className="py-3 pr-3 align-top">
          <Link href={`/documents/${task.id}`} className="font-medium text-white hover:text-red-400">
            {title}
          </Link>
          <p className="mt-1 text-xs text-zinc-500 lg:hidden">{getVehicleLabel(task)}</p>
        </td>
        <td className="hidden py-3 pr-3 align-top text-sm text-zinc-300 lg:table-cell">
          {task.client ? getClientDisplayName(task.client) : dash}
        </td>
        <td className="hidden py-3 pr-3 align-top text-sm text-zinc-400 xl:table-cell">
          {getVehicleLabel(task)}
        </td>
        <td className="py-3 pr-3 align-top">
          <DocumentDeadlineDisplay task={task} showStateLabel />
        </td>
        <td className="py-3 align-top">
          <DocumentStatusBadge status={task.status} />
        </td>
      </tr>
    );
  }

  const employeeFilterSuffix =
    data.employeeId && selectedEmployee !== "all"
      ? `?assigned_to=${encodeURIComponent(data.employeeId)}`
      : "";

  const overdueDocumentsHref = `/documents?overdue=1${
    data.employeeId ? `&assigned_to=${encodeURIComponent(data.employeeId)}` : ""
  }`;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <FileText className="h-5 w-5" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide">
                {t("moduleTitle")}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {t("welcome", { name: data.viewerName })}
            </h1>
            <p className="text-sm text-zinc-400">{t("subtitle")}</p>
            <p className="text-xs text-zinc-500">{formatDate(data.today, dash)}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {data.canSelectEmployee ? (
              <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="w-full min-w-[14rem] border-zinc-800 bg-zinc-900/80 sm:w-56">
                  <SelectValue placeholder={t("allEmployees")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allEmployees")}</SelectItem>
                  {data.assigneeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("newTask")}
              </Button>
              <Button asChild variant="outline">
                <Link href="/documents">{t("allDocuments")}</Link>
              </Button>
            </div>
          </div>
        </div>

        <DateRangeSelector
          from={data.dateRange.from}
          to={data.dateRange.to}
          preset={data.dateRange.preset}
        />
      </header>

      {toast ? (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            toast.type === "success"
              ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-300"
              : "border-red-600/30 bg-red-600/10 text-red-300"
          )}
        >
          {toast.message}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("myActive")}
          value={data.kpis.myActive}
          active={focus === "active"}
          onClick={() => setFocus("active")}
          href={`/documents${employeeFilterSuffix}`}
        />
        <KpiCard
          label={t("dueInPeriod")}
          value={data.kpis.dueInPeriod}
          active={focus === "due_in_period"}
          onClick={() => setFocus("due_in_period")}
          href={`/documents${employeeFilterSuffix}`}
        />
        <KpiCard
          label={t("overdue")}
          value={data.kpis.overdue}
          tone="warning"
          active={focus === "overdue"}
          onClick={() => setFocus("overdue")}
          href={overdueDocumentsHref}
          hint={t("overdueHint")}
        />
        <KpiCard
          label={t("completedInPeriod")}
          value={data.kpis.completedInPeriod}
          tone="success"
          active={focus === "completed"}
          onClick={() => setFocus("completed")}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("needsAttention")}
          </h2>
          {data.hasMoreOverdueAttention ? (
            <Link
              href={overdueDocumentsHref}
              className="text-sm text-red-400 hover:text-red-300"
            >
              {t("showAllOverdue")}
            </Link>
          ) : null}
        </div>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="space-y-3 pt-6">
            {data.needsAttention.length === 0 ? (
              <p className="text-sm text-zinc-400">
                {data.kpis.overdue > 0 ? t("noOverdueTasks") : t("noUrgentToday")}
              </p>
            ) : (
              data.needsAttention.map(renderAttentionRow)
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("todaySection")}
        </h2>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="space-y-3 pt-6">
            {data.todayTasks.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("nothingToday")}</p>
            ) : (
              data.todayTasks.map(renderTodayRow)
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("upcomingDeadlines")}
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { key: "today", label: t("groupToday"), items: data.upcomingDeadlines.today },
            { key: "tomorrow", label: t("groupTomorrow"), items: data.upcomingDeadlines.tomorrow },
            {
              key: "nextSevenDays",
              label: t("groupLaterInPeriod"),
              items: data.upcomingDeadlines.nextSevenDays,
            },
          ].map((group) => (
            <Card key={group.key} className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300">
                  {group.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.length === 0 ? (
                  <p className="text-sm text-zinc-500">{dash}</p>
                ) : (
                  group.items.map(renderCompactTaskRow)
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("myActiveTasks")}
          </h2>
          <Link href={`/documents${employeeFilterSuffix}`} className="text-sm text-red-400 hover:text-red-300">
            {t("showAll")}
          </Link>
        </div>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            {data.activeTasks.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("noActiveTasks")}</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[42rem] text-left text-sm">
                    <thead className="text-zinc-500">
                      <tr>
                        <th className="pb-2 pr-3 font-medium">{tDocuments("priorityLabel")}</th>
                        <th className="pb-2 pr-3 font-medium">{tDocuments("task")}</th>
                        <th className="hidden pb-2 pr-3 font-medium lg:table-cell">
                          {tFields("client")}
                        </th>
                        <th className="hidden pb-2 pr-3 font-medium xl:table-cell">
                          {tFields("car")}
                        </th>
                        <th className="pb-2 pr-3 font-medium">{tDocuments("deadline")}</th>
                        <th className="pb-2 font-medium">{tFields("status")}</th>
                      </tr>
                    </thead>
                    <tbody>{data.activeTasks.map(renderActiveTableRow)}</tbody>
                  </table>
                </div>
                <div className="space-y-2 md:hidden">
                  {data.activeTasks.map(renderCompactTaskRow)}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("recentlyCompleted")}
        </h2>
        <Card className="border-zinc-800/70 bg-zinc-950/30">
          <CardContent className="space-y-2 pt-6">
            {data.recentlyCompleted.length === 0 ? (
              <p className="text-sm text-zinc-500">{dash}</p>
            ) : (
              data.recentlyCompleted.map((task) => (
                <Link
                  key={task.id}
                  href={`/documents/${task.id}`}
                  className="flex flex-col gap-1 rounded-md px-2 py-2 text-sm hover:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-zinc-300">
                    {getTaskTitle(task, (id) => tDocuments("taskFallback", { id }))}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {task.completed_at ? formatDate(task.completed_at.slice(0, 10), dash) : dash}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <DocumentTaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        clients={clients}
        cars={cars}
        profiles={profiles}
      />
    </div>
  );
}
