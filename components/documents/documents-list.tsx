"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Loader2, Plus, Search } from "lucide-react";
import type { ClientOption, Profile } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { DocumentCarOption } from "@/lib/documents/vehicle";
import {
  DOCUMENT_PAYMENT_STATUS_VALUES,
  DOCUMENT_PRIORITY_VALUES,
  DOCUMENT_SORT_VALUES,
  DOCUMENT_TASK_STATUS_VALUES,
  type DocumentSortValue,
} from "@/lib/constants/documents";
import {
  DOCUMENT_LIST_SEGMENTS,
  type DocumentListSegment,
  segmentUsesKanban,
} from "@/lib/documents/list-segment";
import { getAllFilterableServiceCodes } from "@/lib/documents/services";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { getClientDisplayName } from "@/lib/clients/validation";
import {
  getDocumentFinanceSummary,
} from "@/lib/documents/helpers";
import { DocumentTaskFormDialog } from "@/components/documents/document-task-form-dialog";
import { DocumentsKanban } from "@/components/documents/documents-kanban";
import { DocumentQuickPayControl } from "@/components/documents/document-quick-pay-control";
import { DocumentPaymentStatusBadge } from "@/components/documents/document-payment-status-badge";
import { DocumentInlinePrioritySelect } from "@/components/documents/document-inline-priority-select";
import { DocumentInlineAssigneeSelect } from "@/components/documents/document-inline-assignee-select";
import { DocumentInlineDeadlineEditor } from "@/components/documents/document-inline-deadline-editor";
import { DocumentInlineStatusSelect, type DocumentListToast } from "@/components/documents/document-inline-status-select";
import { DocumentArchivedBadge } from "@/components/documents/document-archived-badge";
import { DocumentArchiveRestoreButton } from "@/components/documents/document-archive-restore-button";
import { OrderArchiveRowActions } from "@/components/shared/order-archive-row-actions";
import {
  archiveDocumentTaskAction,
  deleteDocumentTaskAction,
  restoreDocumentTaskAction,
} from "@/lib/actions/documents";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DOCUMENT_PRIORITY_ROW_ACCENT, normalizeDocumentPriority } from "@/lib/documents/priority-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import {
  bindDocumentServiceTranslator,
  translateDocumentService,
} from "@/lib/i18n/documents";
import { cn } from "@/lib/utils";

const SORT_LABEL_KEYS: Record<
  DocumentSortValue,
  | "newest"
  | "oldest"
  | "closestDeadline"
  | "sortDeadlineLatest"
  | "overdueFirst"
  | "highestPrice"
  | "clientName"
  | "sortEmployee"
  | "priorityHighFirst"
  | "priorityLowFirst"
> = {
  newest: "newest",
  oldest: "oldest",
  closest_deadline: "closestDeadline",
  deadline_latest: "sortDeadlineLatest",
  overdue_first: "overdueFirst",
  highest_price: "highestPrice",
  client_name: "clientName",
  employee_name: "sortEmployee",
  priority_high_first: "priorityHighFirst",
  priority_low_first: "priorityLowFirst",
};

type DocumentsListProps = {
  tasks: DocumentTaskWithRelations[];
  clients: ClientOption[];
  cars: DocumentCarOption[];
  profiles: Profile[];
  assignees: Array<{ id: string; full_name: string }>;
  initialQuery: string;
  initialStatus: string;
  initialPriority: string;
  initialServiceType: string;
  initialAssignedTo: string;
  initialPaymentStatus: string;
  initialOverdue: boolean;
  initialDueToday: boolean;
  initialDueThisWeek: boolean;
  initialNoDeadline: boolean;
  initialUnassignedOnly: boolean;
  initialSegment: DocumentListSegment;
  initialSort: string;
  initialView: "table" | "kanban";
  showArchiveMetadata: boolean;
  canRestoreArchived: boolean;
  canArchive: boolean;
  canPermanentlyDelete: boolean;
  initialClientId?: number | null;
  initialCarId?: number | null;
};

function getVehicleLabel(task: DocumentTaskWithRelations, dash: string) {
  return getDocumentVehicleTitle(task, task.car, dash);
}

function getServicesSummary(
  task: DocumentTaskWithRelations,
  formatCurrency: (value: number) => string,
  t: (key: "servicesOrderSummary", values: { count: number; price: string }) => string
) {
  const finance = getDocumentFinanceSummary(task);
  return t("servicesOrderSummary", {
    count: finance.serviceCount,
    price: formatCurrency(finance.servicePrice),
  });
}

export function DocumentsList(props: DocumentsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(
    Boolean(props.initialClientId || props.initialCarId)
  );
  const [query, setQuery] = useState(props.initialQuery);
  const [status, setStatus] = useState(props.initialStatus);
  const [priority, setPriority] = useState(props.initialPriority);
  const [serviceType, setServiceType] = useState(props.initialServiceType);
  const [assignedTo, setAssignedTo] = useState(props.initialAssignedTo);
  const [paymentStatus, setPaymentStatus] = useState(props.initialPaymentStatus);
  const [overdue, setOverdue] = useState(props.initialOverdue);
  const [dueToday, setDueToday] = useState(props.initialDueToday);
  const [dueThisWeek, setDueThisWeek] = useState(props.initialDueThisWeek);
  const [noDeadline, setNoDeadline] = useState(props.initialNoDeadline);
  const [unassignedOnly, setUnassignedOnly] = useState(props.initialUnassignedOnly);
  const [segment, setSegment] = useState<DocumentListSegment>(props.initialSegment);
  const [sort, setSort] = useState(props.initialSort);
  const [view, setView] = useState<"table" | "kanban">(
    segmentUsesKanban(props.initialSegment) ? props.initialView : "table"
  );
  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});
  const [priorityOverrides, setPriorityOverrides] = useState<Record<number, string>>({});
  const [assigneeOverrides, setAssigneeOverrides] = useState<
    Record<number, { id: string | null; name: string | null }>
  >({});
  const [deadlineOverrides, setDeadlineOverrides] = useState<Record<number, string | null>>({});
  const [toast, setToast] = useState<DocumentListToast | null>(null);

  function showToast(next: DocumentListToast) {
    setToast(next);
    window.setTimeout(() => setToast(null), 3000);
  }

  function handleStatusChange(taskId: number, status: string) {
    setStatusOverrides((prev) => ({ ...prev, [taskId]: status }));
  }

  function getTaskStatus(task: DocumentTaskWithRelations) {
    return statusOverrides[task.id] ?? task.status;
  }

  function handlePriorityChange(taskId: number, nextPriority: string) {
    setPriorityOverrides((prev) => ({ ...prev, [taskId]: nextPriority }));
  }

  function getTaskPriority(task: DocumentTaskWithRelations) {
    return priorityOverrides[task.id] ?? task.priority;
  }

  function handleAssignmentChange(
    taskId: number,
    assignedTo: string | null,
    assigneeName: string | null
  ) {
    setAssigneeOverrides((prev) => ({
      ...prev,
      [taskId]: { id: assignedTo, name: assigneeName },
    }));
  }

  function getTaskAssignee(task: DocumentTaskWithRelations) {
    const override = assigneeOverrides[task.id];
    if (override) {
      return { id: override.id, full_name: override.name };
    }
    return task.assignee ?? null;
  }

  function handleDeadlineChange(taskId: number, dueDate: string | null) {
    setDeadlineOverrides((prev) => ({ ...prev, [taskId]: dueDate }));
  }

  function getTaskDeadline(task: DocumentTaskWithRelations) {
    if (task.id in deadlineOverrides) {
      return deadlineOverrides[task.id];
    }
    return task.due_date ?? task.deadline ?? null;
  }

  function getRowAccentClass(task: DocumentTaskWithRelations) {
    const priority = normalizeDocumentPriority(getTaskPriority(task));
    return DOCUMENT_PRIORITY_ROW_ACCENT[priority] ?? "";
  }

  const t = useTranslations("documents");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tSort = useTranslations("documents.sort");
  const tServices = useTranslations("documents.services");
  const tPriority = useTranslations("documents.priority");
  const tPayment = useTranslations("documents.paymentStatus");
  const tStatus = useTranslations("documents.status");
  const tCommon = useTranslations("common");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const dash = tCommon("dash");

  function applyFilters(next: Partial<Record<string, string | boolean>>) {
    const params = new URLSearchParams();
    const values = {
      q: String(next.q ?? query),
      status: String(next.status ?? status),
      priority: String(next.priority ?? priority),
      service_type: String(next.service_type ?? serviceType),
      assigned_to: String(next.assigned_to ?? assignedTo),
      payment_status: String(next.payment_status ?? paymentStatus),
      overdue: Boolean(next.overdue ?? overdue),
      due_today: Boolean(next.due_today ?? dueToday),
      due_this_week: Boolean(next.due_this_week ?? dueThisWeek),
      no_deadline: Boolean(next.no_deadline ?? noDeadline),
      unassigned_only: Boolean(next.unassigned_only ?? unassignedOnly),
      segment: String(next.segment ?? segment) as DocumentListSegment,
      sort: String(next.sort ?? sort),
      view: String(next.view ?? view),
    };

    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.segment !== "active") params.set("segment", values.segment);
    if (values.status !== "all") params.set("status", values.status);
    if (values.priority !== "all") params.set("priority", values.priority);
    if (values.service_type !== "all") params.set("service_type", values.service_type);
    if (values.assigned_to !== "all") params.set("assigned_to", values.assigned_to);
    if (values.payment_status !== "all") params.set("payment_status", values.payment_status);
    if (values.overdue) params.set("overdue", "1");
    if (values.due_today) params.set("due_today", "1");
    if (values.due_this_week) params.set("due_this_week", "1");
    if (values.no_deadline) params.set("no_deadline", "1");
    if (values.unassigned_only) params.set("unassigned_only", "1");
    if (values.sort !== "newest") params.set("sort", values.sort);
    if (values.segment === "active" && values.view !== "table") params.set("view", values.view);
    if (props.initialClientId) params.set("client_id", String(props.initialClientId));

    startTransition(() => {
      router.push(`/documents${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setPriority("all");
    setServiceType("all");
    setAssignedTo("all");
    setPaymentStatus("all");
    setOverdue(false);
    setDueToday(false);
    setDueThisWeek(false);
    setNoDeadline(false);
    setUnassignedOnly(false);
    setSegment("active");
    setSort("newest");
    setView("table");
    startTransition(() => {
      const params = new URLSearchParams();
      if (props.initialClientId) params.set("client_id", String(props.initialClientId));
      router.push(`/documents${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        props.initialQuery ||
          props.initialStatus !== "all" ||
          props.initialPriority !== "all" ||
          props.initialServiceType !== "all" ||
          props.initialAssignedTo !== "all" ||
          props.initialPaymentStatus !== "all" ||
          props.initialOverdue ||
          props.initialDueToday ||
          props.initialDueThisWeek ||
          props.initialNoDeadline ||
          props.initialUnassignedOnly ||
          props.initialSegment !== "active" ||
          props.initialSort !== "newest"
      ),
    [props]
  );

  const isArchivedView = segment === "archived";
  const isReadOnlyRow = isArchivedView;

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-green-500/30 bg-green-950 text-green-200"
              : "border-red-500/30 bg-red-950 text-red-200"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
          <p className="text-zinc-400">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "table" ? "default" : "secondary"}
            onClick={() => {
              setView("table");
              applyFilters({ view: "table" });
            }}
          >
            <List className="h-4 w-4" />
            {t("tableView")}
          </Button>
          {segmentUsesKanban(segment) ? (
          <Button
            variant={view === "kanban" ? "default" : "secondary"}
            onClick={() => {
              setView("kanban");
              applyFilters({ view: "kanban" });
            }}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("kanbanView")}
          </Button>
          ) : null}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("createTask")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DOCUMENT_LIST_SEGMENTS.map((value) => (
          <Button
            key={value}
            variant={segment === value ? "default" : "secondary"}
            onClick={() => {
              setSegment(value);
              const nextView = segmentUsesKanban(value) ? view : "table";
              if (!segmentUsesKanban(value)) setView("table");
              applyFilters({ segment: value, view: nextView });
            }}
          >
            {t(`segment.${value}` as "segment.active")}
          </Button>
        ))}
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 md:col-span-2 xl:col-span-4">
            <label className="text-sm text-zinc-400">{tActions("search")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: query })}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          <FilterSelect label={tFields("status")} value={status} onChange={setStatus} onApply={(v) => applyFilters({ status: v })}>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {DOCUMENT_TASK_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{tStatus(value)}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={t("priorityLabel")} value={priority} onChange={setPriority} onApply={(v) => applyFilters({ priority: v })}>
            <SelectItem value="all">{t("allPriorities")}</SelectItem>
            {DOCUMENT_PRIORITY_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{tPriority(value)}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={tFields("service")} value={serviceType} onChange={setServiceType} onApply={(v) => applyFilters({ service_type: v })}>
            <SelectItem value="all">{t("allServices")}</SelectItem>
            {getAllFilterableServiceCodes().map((value) => (
              <SelectItem key={value} value={value}>
                {translateDocumentService(bindDocumentServiceTranslator(tServices as (key: never) => string), value)}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={t("responsibleEmployee")} value={assignedTo} onChange={setAssignedTo} onApply={(v) => applyFilters({ assigned_to: v })}>
            <SelectItem value="all">{t("allAssignees")}</SelectItem>
            <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
            {props.assignees.map((person) => (
              <SelectItem key={person.id} value={person.id}>{person.full_name}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={t("paymentStatusLabel")} value={paymentStatus} onChange={setPaymentStatus} onApply={(v) => applyFilters({ payment_status: v })}>
            <SelectItem value="all">{t("allPaymentStatuses")}</SelectItem>
            {DOCUMENT_PAYMENT_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{tPayment(value)}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={tFields("sort")} value={sort} onChange={setSort} onApply={(v) => applyFilters({ sort: v })}>
            {DOCUMENT_SORT_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{tSort(SORT_LABEL_KEYS[value])}</SelectItem>
            ))}
          </FilterSelect>

          <div className="flex flex-wrap items-end gap-4 md:col-span-2 xl:col-span-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={priority === "urgent"}
                onChange={(e) => {
                  const next = e.target.checked ? "urgent" : "all";
                  setPriority(next);
                  applyFilters({ priority: next });
                }}
              />
              {t("urgentOnly")}
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={unassignedOnly} onChange={(e) => { setUnassignedOnly(e.target.checked); applyFilters({ unassigned_only: e.target.checked }); }} />
              {t("unassignedOnly")}
            </label>
            {!isArchivedView ? (
              <>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={overdue} onChange={(e) => { setOverdue(e.target.checked); applyFilters({ overdue: e.target.checked }); }} />
              {t("overdueOnly")}
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={dueToday} onChange={(e) => { setDueToday(e.target.checked); applyFilters({ due_today: e.target.checked }); }} />
              {t("dueToday")}
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={dueThisWeek} onChange={(e) => { setDueThisWeek(e.target.checked); applyFilters({ due_this_week: e.target.checked }); }} />
              {t("dueThisWeek")}
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={noDeadline} onChange={(e) => { setNoDeadline(e.target.checked); applyFilters({ no_deadline: e.target.checked }); }} />
              {t("noDeadline")}
            </label>
              </>
            ) : null}
            <Button variant="secondary" onClick={() => applyFilters({ q: query })} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("applyFilters")}
            </Button>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters} disabled={isPending}>
                {t("clearFilters")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : null}

      {props.tasks.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-white">{hasFilters ? t("notFound") : t("empty")}</p>
            <p className="mt-2 text-sm text-zinc-400">{hasFilters ? t("notFoundHint") : t("emptyHint")}</p>
            {!hasFilters ? (
              <Button className="mt-6" onClick={() => setCreateOpen(true)}>{t("createTask")}</Button>
            ) : null}
          </CardContent>
        </Card>
      ) : view === "kanban" && segmentUsesKanban(segment) ? (
        <DocumentsKanban tasks={props.tasks} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 lg:block">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">{tFields("client")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("car")}</th>
                  <th className="px-4 py-3 font-medium">{t("servicesTitle")}</th>
                  <th className="px-4 py-3 font-medium">{t("responsibleEmployee")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("priorityLabel")}</th>
                  <th className="px-4 py-3 font-medium">{t("startDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("deadline")}</th>
                  {props.showArchiveMetadata && isArchivedView ? (
                    <>
                      <th className="px-4 py-3 font-medium">{t("archivedAt")}</th>
                      <th className="px-4 py-3 font-medium">{t("archivedBy")}</th>
                    </>
                  ) : null}
                  <th className="px-4 py-3 font-medium">{t("totalPrice")}</th>
                  <th className="px-4 py-3 font-medium">{t("paidAmount")}</th>
                  <th className="px-4 py-3 font-medium">{t("debt")}</th>
                  <th className="px-4 py-3 font-medium">{t("paymentStatusLabel")}</th>
                  {!isReadOnlyRow ? (
                    <th className="px-4 py-3 font-medium">{t("quickPaid")}</th>
                  ) : null}
                  {isArchivedView && props.canRestoreArchived ? (
                    <th className="px-4 py-3 font-medium">{t("restoreTask")}</th>
                  ) : null}
                  {(props.canArchive || props.canPermanentlyDelete) ? (
                    <th className="px-4 py-3 font-medium">{tActions("actions")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {props.tasks.map((task) => {
                  const finance = getDocumentFinanceSummary(task);
                  const assignee = getTaskAssignee(task);
                  const deadlineTask = {
                    ...task,
                    due_date: getTaskDeadline(task),
                    deadline: null,
                  };
                  return (
                    <tr key={task.id} className={cn("border-t border-zinc-800/80 hover:bg-zinc-900/50", getRowAccentClass(task))}>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/documents/${task.id}`} className="font-medium text-white hover:text-red-400">
                            #{task.id}
                          </Link>
                          {isArchivedView ? <DocumentArchivedBadge /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {task.client ? (
                          <Link href={`/clients/${task.client.id}`} className="hover:text-red-400">
                            {getClientDisplayName(task.client)}
                          </Link>
                        ) : dash}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{getVehicleLabel(task, dash)}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {getServicesSummary(task, formatCurrency, t)}
                      </td>
                      <td className="px-4 py-3">
                        {isReadOnlyRow ? (
                          <span className="text-zinc-300">{assignee?.full_name ?? t("unassigned")}</span>
                        ) : (
                        <DocumentInlineAssigneeSelect
                          key={`assignee-${task.id}-${assignee?.id ?? "none"}-${assignee?.full_name ?? ""}`}
                          taskId={task.id}
                          assignedTo={assignee?.id ?? task.assigned_to}
                          assigneeName={assignee?.full_name}
                          profiles={props.profiles}
                          onAssignmentChange={handleAssignmentChange}
                          onToast={showToast}
                        />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isReadOnlyRow ? (
                          <DocumentStatusBadge status={getTaskStatus(task)} />
                        ) : (
                        <DocumentInlineStatusSelect
                          taskId={task.id}
                          status={getTaskStatus(task)}
                          onStatusChange={handleStatusChange}
                          onToast={showToast}
                        />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isReadOnlyRow ? (
                          <span className="text-zinc-300">{tPriority(getTaskPriority(task) as "low")}</span>
                        ) : (
                        <DocumentInlinePrioritySelect
                          taskId={task.id}
                          priority={getTaskPriority(task)}
                          onPriorityChange={handlePriorityChange}
                          onToast={showToast}
                        />
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{formatDate(task.started_at, dash)}</td>
                      <td className="px-4 py-3">
                        {isReadOnlyRow ? (
                          <span className="text-zinc-300">{formatDate(getTaskDeadline(task), dash)}</span>
                        ) : (
                        <DocumentInlineDeadlineEditor
                          key={`deadline-${task.id}-${getTaskDeadline(task) ?? "none"}`}
                          taskId={task.id}
                          task={deadlineTask}
                          onDeadlineChange={handleDeadlineChange}
                          onToast={showToast}
                        />
                        )}
                      </td>
                      {props.showArchiveMetadata && isArchivedView ? (
                        <>
                          <td className="px-4 py-3 text-zinc-300">
                            {formatDateTime(task.archived_at, dash)}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {task.archiver?.full_name ?? dash}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3 text-zinc-300">{formatCurrency(finance.servicePrice)}</td>
                      <td className="px-4 py-3 text-zinc-300">{formatCurrency(finance.paidAmount)}</td>
                      <td className="px-4 py-3 text-zinc-300">{formatCurrency(finance.outstandingBalance)}</td>
                      <td className="px-4 py-3">
                        <DocumentPaymentStatusBadge status={finance.paymentStatus} />
                      </td>
                      {!isReadOnlyRow ? (
                      <td className="px-4 py-3">
                        <DocumentQuickPayControl task={task} />
                      </td>
                      ) : null}
                      {isArchivedView && props.canRestoreArchived ? (
                        <td className="px-4 py-3">
                          <DocumentArchiveRestoreButton taskId={task.id} compact />
                        </td>
                      ) : null}
                      {(props.canArchive || props.canPermanentlyDelete) ? (
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <OrderArchiveRowActions
                            entityName={`#${task.id}`}
                            isArchived={isArchivedView}
                            canArchive={props.canArchive && !isArchivedView}
                            canRestore={props.canRestoreArchived && isArchivedView}
                            canPermanentlyDelete={props.canPermanentlyDelete && isArchivedView}
                            onArchive={() => archiveDocumentTaskAction(task.id)}
                            onRestore={() => restoreDocumentTaskAction(task.id)}
                            onPermanentDelete={() => deleteDocumentTaskAction(task.id)}
                            archiveLabel={t("archiveTask")}
                            restoreLabel={t("restoreTask")}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {props.tasks.map((task) => {
              const finance = getDocumentFinanceSummary(task);
              const assignee = getTaskAssignee(task);
              const deadlineTask = {
                ...task,
                due_date: getTaskDeadline(task),
                deadline: null,
              };
              return (
                <Card key={task.id} className={cn("border-zinc-800 bg-zinc-900/60", getRowAccentClass(task))}>
                  <CardHeader>
                    <CardTitle className="text-base text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/documents/${task.id}`} className="hover:text-red-400">
                          #{task.id}
                        </Link>
                        {isArchivedView ? <DocumentArchivedBadge /> : null}
                      </div>
                      <div className="mt-1 text-sm font-normal text-zinc-400">
                        {getServicesSummary(task, formatCurrency, t)}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm text-zinc-300">
                    <div className="flex flex-wrap items-center gap-2">
                      {isReadOnlyRow ? (
                        <>
                          <DocumentStatusBadge status={getTaskStatus(task)} />
                          <span className="text-zinc-400">{tPriority(getTaskPriority(task) as "low")}</span>
                        </>
                      ) : (
                        <>
                      <DocumentInlineStatusSelect
                        taskId={task.id}
                        status={getTaskStatus(task)}
                        onStatusChange={handleStatusChange}
                        onToast={showToast}
                        className="min-w-0 w-full sm:w-auto"
                      />
                      <DocumentInlinePrioritySelect
                        taskId={task.id}
                        priority={getTaskPriority(task)}
                        onPriorityChange={handlePriorityChange}
                        onToast={showToast}
                        className="min-w-0 w-full sm:w-auto"
                      />
                        </>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">{t("responsibleEmployee")}</span>
                        {isReadOnlyRow ? (
                          <span>{assignee?.full_name ?? t("unassigned")}</span>
                        ) : (
                        <DocumentInlineAssigneeSelect
                          key={`assignee-mobile-${task.id}-${assignee?.id ?? "none"}-${assignee?.full_name ?? ""}`}
                          taskId={task.id}
                          assignedTo={assignee?.id ?? task.assigned_to}
                          assigneeName={assignee?.full_name}
                          profiles={props.profiles}
                          onAssignmentChange={handleAssignmentChange}
                          onToast={showToast}
                          className="max-w-[14rem]"
                        />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">{t("deadline")}</span>
                        {isReadOnlyRow ? (
                          <span>{formatDate(getTaskDeadline(task), dash)}</span>
                        ) : (
                        <DocumentInlineDeadlineEditor
                          key={`deadline-mobile-${task.id}-${getTaskDeadline(task) ?? "none"}`}
                          taskId={task.id}
                          task={deadlineTask}
                          onDeadlineChange={handleDeadlineChange}
                          onToast={showToast}
                          className="max-w-[14rem]"
                        />
                        )}
                      </div>
                    </div>
                    {props.showArchiveMetadata && isArchivedView ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <span className="text-zinc-500">{t("archivedAt")}</span>
                          <span>{formatDateTime(task.archived_at, dash)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-zinc-500">{t("archivedBy")}</span>
                          <span>{task.archiver?.full_name ?? dash}</span>
                        </div>
                      </>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <DocumentPaymentStatusBadge status={finance.paymentStatus} />
                      {!isReadOnlyRow ? (
                        <DocumentQuickPayControl task={task} compact />
                      ) : props.canRestoreArchived ? (
                        <DocumentArchiveRestoreButton taskId={task.id} compact />
                      ) : null}
                      {(props.canArchive || props.canPermanentlyDelete) ? (
                        <OrderArchiveRowActions
                          entityName={`#${task.id}`}
                          isArchived={isArchivedView}
                          canArchive={props.canArchive && !isArchivedView}
                          canRestore={props.canRestoreArchived && isArchivedView}
                          canPermanentlyDelete={props.canPermanentlyDelete && isArchivedView}
                          onArchive={() => archiveDocumentTaskAction(task.id)}
                          onRestore={() => restoreDocumentTaskAction(task.id)}
                          onPermanentDelete={() => deleteDocumentTaskAction(task.id)}
                          archiveLabel={t("archiveTask")}
                          restoreLabel={t("restoreTask")}
                        />
                      ) : null}
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields("client")}</span>
                      <span>{task.client ? getClientDisplayName(task.client) : dash}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{t("debt")}</span>
                      <span>{formatCurrency(finance.outstandingBalance)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <DocumentTaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        clients={props.clients}
        cars={props.cars}
        profiles={props.profiles}
        initialClientId={props.initialClientId}
        initialCarId={props.initialCarId}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  onApply,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onApply: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400">{label}</label>
      <Select
        value={value}
        onValueChange={(next) => {
          onChange(next);
          onApply(next);
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
