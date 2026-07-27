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
import { getAllFilterableServiceCodes } from "@/lib/documents/services";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { getClientDisplayName } from "@/lib/clients/validation";
import {
  getDocumentFinanceSummary,
  getTaskDueDate,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import { DocumentTaskFormDialog } from "@/components/documents/document-task-form-dialog";
import { DocumentsKanban } from "@/components/documents/documents-kanban";
import { DocumentQuickPayControl } from "@/components/documents/document-quick-pay-control";
import { DocumentPaymentStatusBadge } from "@/components/documents/document-payment-status-badge";
import { DocumentPriorityBadge } from "@/components/documents/document-priority-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
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
  translateDocumentPaymentStatus,
  translateDocumentService,
} from "@/lib/i18n/documents";

const SORT_LABEL_KEYS: Record<
  DocumentSortValue,
  "newest" | "oldest" | "closestDeadline" | "overdueFirst" | "highestPrice" | "clientName"
> = {
  newest: "newest",
  oldest: "oldest",
  closest_deadline: "closestDeadline",
  overdue_first: "overdueFirst",
  highest_price: "highestPrice",
  client_name: "clientName",
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
  initialArchived: boolean;
  initialSort: string;
  initialView: "table" | "kanban";
  initialClientId?: number | null;
  initialCarId?: number | null;
};

function getVehicleLabel(task: DocumentTaskWithRelations, dash: string) {
  return getDocumentVehicleTitle(task, task.car, dash);
}

function getServiceLabel(
  task: DocumentTaskWithRelations,
  tServices: (key: string) => string
) {
  if (task.service_type === "custom") {
    return task.custom_service_name?.trim() || tServices("custom");
  }
  return task.service_type
    ? translateDocumentService(bindDocumentServiceTranslator(tServices as (key: never) => string), task.service_type)
    : "—";
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
  const [archived, setArchived] = useState(props.initialArchived);
  const [sort, setSort] = useState(props.initialSort);
  const [view, setView] = useState<"table" | "kanban">(props.initialView);

  const t = useTranslations("documents");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tSort = useTranslations("documents.sort");
  const tServices = useTranslations("documents.services");
  const tPriority = useTranslations("documents.priority");
  const tPayment = useTranslations("documents.paymentStatus");
  const tStatus = useTranslations("documents.status");
  const tCommon = useTranslations("common");
  const { formatCurrency, formatDate } = useFormatters();
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
      archived: Boolean(next.archived ?? archived),
      sort: String(next.sort ?? sort),
      view: String(next.view ?? view),
    };

    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.status !== "all") params.set("status", values.status);
    if (values.priority !== "all") params.set("priority", values.priority);
    if (values.service_type !== "all") params.set("service_type", values.service_type);
    if (values.assigned_to !== "all") params.set("assigned_to", values.assigned_to);
    if (values.payment_status !== "all") params.set("payment_status", values.payment_status);
    if (values.overdue) params.set("overdue", "1");
    if (values.archived) params.set("archived", "1");
    if (values.sort !== "newest") params.set("sort", values.sort);
    if (values.view !== "table") params.set("view", values.view);
    if (props.initialClientId) params.set("client_id", String(props.initialClientId));

    startTransition(() => {
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
          props.initialArchived ||
          props.initialSort !== "newest"
      ),
    [props]
  );

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("createTask")}
          </Button>
        </div>
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

          <FilterSelect label={tFields("manager")} value={assignedTo} onChange={setAssignedTo} onApply={(v) => applyFilters({ assigned_to: v })}>
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
              <input type="checkbox" checked={overdue} onChange={(e) => { setOverdue(e.target.checked); applyFilters({ overdue: e.target.checked }); }} />
              {t("overdueOnly")}
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={archived} onChange={(e) => { setArchived(e.target.checked); applyFilters({ archived: e.target.checked }); }} />
              {t("archivedOnly")}
            </label>
            <Button variant="secondary" onClick={() => applyFilters({ q: query })} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("applyFilters")}
            </Button>
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
      ) : view === "kanban" ? (
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
                  <th className="px-4 py-3 font-medium">{tFields("service")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("manager")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("priorityLabel")}</th>
                  <th className="px-4 py-3 font-medium">{t("startDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("dueDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("servicePrice")}</th>
                  <th className="px-4 py-3 font-medium">{t("paidAmount")}</th>
                  <th className="px-4 py-3 font-medium">{t("debt")}</th>
                  <th className="px-4 py-3 font-medium">{t("paymentStatusLabel")}</th>
                  <th className="px-4 py-3 font-medium">{t("quickPaid")}</th>
                </tr>
              </thead>
              <tbody>
                {props.tasks.map((task) => {
                  const finance = getDocumentFinanceSummary(task);
                  const overdueTask = isTaskOverdue(task);
                  return (
                    <tr key={task.id} className="border-t border-zinc-800/80 hover:bg-zinc-900/50">
                      <td className="px-4 py-3">
                        <Link href={`/documents/${task.id}`} className="font-medium text-white hover:text-red-400">
                          #{task.id}
                        </Link>
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
                        {getServiceLabel(task, (key) => tServices(key as never))}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{task.assignee?.full_name ?? t("unassigned")}</td>
                      <td className="px-4 py-3"><DocumentStatusBadge status={task.status} /></td>
                      <td className="px-4 py-3"><DocumentPriorityBadge priority={task.priority} /></td>
                      <td className="px-4 py-3 text-zinc-300">{formatDate(task.started_at, dash)}</td>
                      <td className={`px-4 py-3 ${overdueTask ? "font-medium text-red-400" : "text-zinc-300"}`}>
                        {formatDate(getTaskDueDate(task), dash)}
                        {overdueTask ? ` (${t("overdue")})` : ""}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{formatCurrency(finance.servicePrice)}</td>
                      <td className="px-4 py-3 text-zinc-300">{formatCurrency(finance.paidAmount)}</td>
                      <td className="px-4 py-3 text-zinc-300">{formatCurrency(finance.outstandingBalance)}</td>
                      <td className="px-4 py-3">
                        <DocumentPaymentStatusBadge status={finance.paymentStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <DocumentQuickPayControl task={task} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {props.tasks.map((task) => {
              const finance = getDocumentFinanceSummary(task);
              const overdueTask = isTaskOverdue(task);
              return (
                <Card key={task.id} className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader>
                    <CardTitle className="text-base text-white">
                      <Link href={`/documents/${task.id}`} className="hover:text-red-400">
                        #{task.id} — {getServiceLabel(task, (key) => tServices(key as never))}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm text-zinc-300">
                    <div className="flex flex-wrap gap-2">
                      <DocumentStatusBadge status={task.status} />
                      <DocumentPriorityBadge priority={task.priority} />
                      {overdueTask ? <span className="text-red-400">{t("overdue")}</span> : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <DocumentPaymentStatusBadge status={finance.paymentStatus} />
                      <DocumentQuickPayControl task={task} compact />
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
