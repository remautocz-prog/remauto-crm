"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Car,
  CreditCard,
  FileText,
  Flame,
  RefreshCw,
  StickyNote,
  UserCheck,
  UserCog,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { DashboardActivityItem, DashboardActivityKind } from "@/lib/types/dashboard";
import {
  translateDocumentPriority,
  translateDocumentStatus,
} from "@/lib/i18n/documents";
import { DashboardSectionState } from "@/components/dashboard/dashboard-section-state";
import { useFormatters } from "@/lib/hooks/use-formatters";

const ACTIVITY_ICONS: Record<DashboardActivityKind, LucideIcon> = {
  client_created: UserPlus,
  client_updated: UserCog,
  note_added: StickyNote,
  vehicle_created: Car,
  vehicle_sold: Car,
  order_created: FileText,
  status_changed: RefreshCw,
  priority_changed: Flame,
  employee_assigned: UserCheck,
  payment_marked: CreditCard,
};

type DashboardRecentActivityProps = {
  items: DashboardActivityItem[];
  error?: string;
};

export function DashboardRecentActivitySection({
  items,
  error,
}: DashboardRecentActivityProps) {
  const t = useTranslations("dashboard");
  const tStatus = useTranslations("documents.status");
  const tPriority = useTranslations("documents.priority");
  const { formatDateTime, formatCurrency } = useFormatters();

  function getActionLabel(item: DashboardActivityItem) {
    switch (item.kind) {
      case "client_created":
        return t("activityClientCreated");
      case "client_updated":
        return t("activityClientUpdated");
      case "note_added":
        return t("activityNoteAdded");
      case "vehicle_created":
        return t("activityVehicleCreated");
      case "vehicle_sold":
        return t("activityVehicleSold");
      case "order_created":
        return t("activityOrderCreated");
      case "status_changed":
        return t("activityStatusChanged");
      case "priority_changed":
        return t("activityPriorityChanged");
      case "employee_assigned":
        return t("activityEmployeeAssigned");
      case "payment_marked":
        return t("activityPaymentMarked");
      default:
        return item.entityName;
    }
  }

  function getMetaLabel(item: DashboardActivityItem) {
    if (!item.meta) return null;

    switch (item.kind) {
      case "status_changed":
        return translateDocumentStatus(tStatus, item.meta);
      case "priority_changed":
        return translateDocumentPriority(tPriority, item.meta);
      case "payment_marked":
        return formatCurrency(Number(item.meta));
      case "employee_assigned":
        return item.meta;
      default:
        return item.meta;
    }
  }

  return (
    <DashboardSectionState
      title={t("recentActivity")}
      error={error}
      isEmpty={!error && items.length === 0}
      emptyMessage={t("noRecentActivity")}
    >
      <ol className="relative space-y-0 border-l border-zinc-800 pl-4">
        {items.map((item) => {
          const Icon = ACTIVITY_ICONS[item.kind];
          const actionLabel = getActionLabel(item);
          const metaLabel = getMetaLabel(item);

          return (
            <li key={item.id} className="relative pb-5 last:pb-0">
              <article className="relative pl-3">
                <span
                  className="absolute -left-[1.35rem] top-1 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900"
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5 text-zinc-400" />
                </span>

                <p className="text-sm font-medium text-white">{actionLabel}</p>
                <p className="mt-0.5 truncate text-sm text-zinc-300">{item.entityName}</p>

                {metaLabel && item.kind !== "note_added" ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{metaLabel}</p>
                ) : null}

                {item.preview ? (
                  <p className="mt-0.5 truncate text-xs italic text-zinc-600">
                    {item.preview}
                  </p>
                ) : null}

                {item.employeeName ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{item.employeeName}</p>
                ) : null}

                <p className="mt-1 text-xs text-zinc-600">
                  <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
                </p>

                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-2 inline-block text-xs font-medium text-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 rounded-sm"
                  >
                    {t("openRelatedRecord")}
                  </Link>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </DashboardSectionState>
  );
}
