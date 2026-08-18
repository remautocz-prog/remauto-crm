"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Car,
  ClipboardList,
  FileText,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { OwnerAttentionSection } from "@/components/dashboard/owner-attention-section";
import { OwnerKpiCard } from "@/components/dashboard/owner-kpi-card";
import { Button } from "@/components/ui/button";
import type { AdminTeamWorkloadRow } from "@/lib/dashboard/admin-team-workload";
import type { WorkloadSignal } from "@/lib/dashboard/workload-thresholds";
import type { OwnerAttentionRow } from "@/lib/dashboard/owner-attention";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { getCustomerDisplayName } from "@/lib/detailing/validation";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { getDetailingFilterHref } from "@/lib/dashboard/links";
import type { AdminDashboardData } from "@/lib/types/admin-dashboard";
import type { Car as CarRecord } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { cn } from "@/lib/utils";

type AdminDashboardProps = {
  data: AdminDashboardData;
  userName?: string | null;
};

const WORKLOAD_SIGNAL_STYLES: Record<
  WorkloadSignal,
  { labelKey: "workloadNormal" | "workloadBusy" | "workloadOverloaded"; dot: string }
> = {
  normal: { labelKey: "workloadNormal", dot: "bg-emerald-400" },
  busy: { labelKey: "workloadBusy", dot: "bg-amber-400" },
  overloaded: { labelKey: "workloadOverloaded", dot: "bg-red-400" },
};

function SectionPanel({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: typeof AlertTriangle;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60">
            <Icon className="h-4 w-4 text-zinc-300" aria-hidden />
          </div>
        ) : null}
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-4 text-xs text-zinc-500">
      {message}
    </p>
  );
}

function TodayList({
  title,
  emptyMessage,
  children,
}: {
  title: string;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-zinc-300">{title}</h4>
      {children ?? <EmptyState message={emptyMessage} />}
    </div>
  );
}

function DocumentTodayItem({ task }: { task: DocumentTaskWithRelations }) {
  const title =
    task.custom_service_name?.trim() ||
    task.service_type?.trim() ||
    task.work_type?.trim() ||
    `#${task.id}`;
  const vehicle = getDocumentVehicleTitle(task, task.car, "—");

  return (
    <Link
      href={`/documents/${task.id}`}
      className="block rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
    >
      <p className="truncate text-sm font-medium text-white">{vehicle}</p>
      <p className="truncate text-xs text-zinc-400">{title}</p>
    </Link>
  );
}

function DetailingTodayItem({ order }: { order: DetailingOrderWithServices }) {
  const customer = getCustomerDisplayName(order);
  const vehicle = order.vehicle_make_model || order.id.slice(0, 8);

  return (
    <Link
      href={`/detailing/orders/${order.id}`}
      className="block rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
    >
      <p className="truncate text-sm font-medium text-white">{customer}</p>
      <p className="truncate text-xs text-zinc-400">{vehicle}</p>
    </Link>
  );
}

function CarTodayItem({ car }: { car: CarRecord }) {
  const title = [car.brand, car.model, car.year].filter(Boolean).join(" ");

  return (
    <Link
      href={`/cars/${car.id}`}
      className="block rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
    >
      <p className="truncate text-sm font-medium text-white">{title || car.id}</p>
      <p className="truncate text-xs text-zinc-400">
        {car.registration_number || car.stock_number || "—"}
      </p>
    </Link>
  );
}

function StuckProcessRow({
  item,
  t,
}: {
  item: OwnerAttentionRow;
  t: ReturnType<typeof useTranslations<"dashboard.admin">>;
}) {
  const reason = item.reasonParams?.highPriority
    ? t("attentionReasonDocumentOverdueHighPriority", {
        days: item.reasonParams.days ?? 0,
      })
    : t(item.reasonKey as never, item.reasonParams as never);

  return (
    <Link
      href={item.href}
      className="block rounded-lg border border-amber-500/20 bg-amber-950/10 px-3 py-2.5 transition-colors hover:border-amber-500/35"
    >
      <p className="truncate text-sm font-medium text-white">{item.title}</p>
      <p className="truncate text-xs text-zinc-400">{item.subtitle}</p>
      <p className="mt-1 text-xs text-amber-200/90">{reason}</p>
    </Link>
  );
}

function TeamWorkloadRow({
  row,
  t,
}: {
  row: AdminTeamWorkloadRow;
  t: ReturnType<typeof useTranslations<"dashboard.admin">>;
}) {
  const signal = WORKLOAD_SIGNAL_STYLES[row.signal];
  const moduleLabel =
    row.module === "documents" ? t("moduleDocuments") : t("moduleDetailing");

  return (
    <Link
      href={row.href}
      className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 transition-colors hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{row.name}</p>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
            {moduleLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {t("activeWorkload")}: {row.activeCount}
          {row.readyCount > 0 ? ` · ${t("readyWork")}: ${row.readyCount}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {row.overdueCount > 0 ? (
          <span className="text-red-300">
            {t("criticalItems")}: {row.overdueCount}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-zinc-300">
          <span className={cn("h-2 w-2 rounded-full", signal.dot)} aria-hidden />
          {t(signal.labelKey)}
        </span>
      </div>
    </Link>
  );
}

export function AdminDashboard({ data, userName }: AdminDashboardProps) {
  const t = useTranslations("dashboard.admin");
  const tDoc = useTranslations("dashboard");
  const { formatCurrency, formatNumber, formatDate } = useFormatters();
  const todayLabel = formatDate(new Date().toISOString().slice(0, 10));

  const kpiCards = [
    {
      id: "requires-attention",
      label: t("requiresAttention"),
      value: formatNumber(data.kpis.requiresAttention),
      hint: t("currentSnapshotHint"),
      icon: AlertTriangle,
      tone: "attention" as const,
      href: "#attention",
    },
    {
      id: "overdue-documents",
      label: t("overdueDocuments"),
      value: formatNumber(data.kpis.overdueDocuments),
      hint: t("currentSnapshotHint"),
      icon: FileText,
      tone: "documents" as const,
      href: "/documents?overdue=1",
    },
    {
      id: "detailing-in-progress",
      label: t("detailingInProgress"),
      value: formatNumber(data.kpis.detailingInProgress),
      hint: t("currentSnapshotHint"),
      icon: Sparkles,
      tone: "detailing" as const,
      href: "/detailing",
    },
    {
      id: "unpaid-detailing",
      label: t("unpaidDetailing"),
      value: formatCurrency(data.kpis.detailingReceivables.outstandingAmount),
      hint: t("unpaidDetailingOrdersHint", {
        count: data.kpis.detailingReceivables.unpaidOrderCount,
      }),
      icon: ClipboardList,
      tone: "attention" as const,
      href: getDetailingFilterHref({ paymentOutstanding: true }),
    },
    {
      id: "cars-requiring-action",
      label: t("carsRequiringAction"),
      value: formatNumber(data.kpis.carsRequiringAction),
      hint: t("currentSnapshotHint"),
      icon: Car,
      tone: "cars" as const,
      href: "/cars",
    },
  ];

  const quickActions = [
    data.quickActions.canCreateDocument
      ? {
          href: "/documents",
          label: t("newDocumentTask"),
          icon: FileText,
        }
      : null,
    data.quickActions.canCreateDetailing
      ? {
          href: "/detailing/orders/new",
          label: t("newDetailingOrder"),
          icon: Sparkles,
        }
      : null,
    data.quickActions.canCreateCar
      ? {
          href: "/cars/new",
          label: tDoc("newCar"),
          icon: Car,
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Car }[];

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {userName ? `${t("title")} — ${userName}` : t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
          <p className="mt-1 text-xs text-zinc-500">{todayLabel}</p>
        </div>

        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant="outline"
                size="sm"
                className="gap-2 border-zinc-700"
              >
                <Link href={action.href}>
                  <Plus className="h-4 w-4 text-red-400" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <OwnerKpiCard key={card.id} {...card} />
        ))}
      </div>

      <OwnerAttentionSection
        attention={data.attention}
        quickActions={data.attentionQuickActions}
        translationNamespace="dashboard.admin"
        sectionId="attention"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionPanel title={t("today")} icon={ClipboardList}>
          <div className="space-y-5">
            <TodayList
              title={t("todayDocumentsDue")}
              emptyMessage={t("todayEmpty")}
            >
              {data.errors.documents ? (
                <EmptyState message={t("sectionLoadFailed")} />
              ) : data.today.documentsDueToday.length > 0 ? (
                <ul className="space-y-2">
                  {data.today.documentsDueToday.map((task) => (
                    <li key={task.id}>
                      <DocumentTodayItem task={task} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList
              title={t("todayDocumentsOverdue")}
              emptyMessage={t("todayEmpty")}
            >
              {data.errors.documents ? (
                <EmptyState message={t("sectionLoadFailed")} />
              ) : data.today.documentsOverdue.length > 0 ? (
                <ul className="space-y-2">
                  {data.today.documentsOverdue.map((task) => (
                    <li key={task.id}>
                      <DocumentTodayItem task={task} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList
              title={t("todayDetailingScheduled")}
              emptyMessage={t("todayEmpty")}
            >
              {data.errors.detailing ? (
                <EmptyState message={t("sectionLoadFailed")} />
              ) : data.today.detailingScheduledToday.length > 0 ? (
                <ul className="space-y-2">
                  {data.today.detailingScheduledToday.map((order) => (
                    <li key={order.id}>
                      <DetailingTodayItem order={order} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList title={t("todayDetailingReady")} emptyMessage={t("todayEmpty")}>
              {data.errors.detailing ? (
                <EmptyState message={t("sectionLoadFailed")} />
              ) : data.today.detailingReady.length > 0 ? (
                <ul className="space-y-2">
                  {data.today.detailingReady.map((order) => (
                    <li key={order.id}>
                      <DetailingTodayItem order={order} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList
              title={t("todayDetailingCompletion")}
              emptyMessage={t("todayEmpty")}
            >
              {data.errors.detailing ? (
                <EmptyState message={t("sectionLoadFailed")} />
              ) : data.today.detailingCompletionToday.length > 0 ? (
                <ul className="space-y-2">
                  {data.today.detailingCompletionToday.map((order) => (
                    <li key={order.id}>
                      <DetailingTodayItem order={order} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>

            <TodayList title={t("todayCarsSale")} emptyMessage={t("todayEmpty")}>
              {data.errors.cars ? (
                <EmptyState message={t("sectionLoadFailed")} />
              ) : data.today.carsSaleToday.length > 0 ? (
                <ul className="space-y-2">
                  {data.today.carsSaleToday.map((car) => (
                    <li key={car.id}>
                      <CarTodayItem car={car} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TodayList>
          </div>
        </SectionPanel>

        <SectionPanel title={t("teamWorkload")} icon={Users}>
          {data.errors.team ? (
            <EmptyState message={t("sectionLoadFailed")} />
          ) : data.teamWorkload.length === 0 ? (
            <EmptyState message={t("teamWorkloadEmpty")} />
          ) : (
            <ul className="space-y-2">
              {data.teamWorkload.map((row) => (
                <li key={`${row.module}-${row.id}`}>
                  <TeamWorkloadRow row={row} t={t} />
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>

      <SectionPanel title={t("stuckProcesses")} icon={AlertTriangle}>
        {data.stuckProcesses.length === 0 ? (
          <EmptyState message={t("noOperationalIssues")} />
        ) : (
          <ul className="space-y-2">
            {data.stuckProcesses.map((item) => (
              <li key={item.id}>
                <StuckProcessRow item={item} t={t} />
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
