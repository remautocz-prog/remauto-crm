"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DashboardActivityItem, DashboardActivityKind } from "@/lib/types/dashboard";
import {
  translateDocumentPriority,
  translateDocumentStatus,
} from "@/lib/i18n/documents";
import { useFormatters } from "@/lib/hooks/use-formatters";
import {
  Car,
  CreditCard,
  FileText,
  Flame,
  Receipt,
  RefreshCw,
  Sparkles,
  StickyNote,
  UserCheck,
  UserCog,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

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
  detailing_created: Sparkles,
  detailing_status_changed: RefreshCw,
  expense_added: Receipt,
};

type OwnerRecentActivityProps = {
  items: DashboardActivityItem[];
  error?: string;
};

export function OwnerRecentActivity({
  items,
  error,
}: OwnerRecentActivityProps) {
  const t = useTranslations("dashboard");
  const tOwner = useTranslations("dashboard.owner");
  const tStatus = useTranslations("documents.status");
  const tPriority = useTranslations("documents.priority");
  const tDetailingStatus = useTranslations("detailing.status");
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
      case "detailing_created":
        return t("activityDetailingCreated");
      case "detailing_status_changed":
        return t("activityDetailingStatusChanged");
      case "expense_added":
        return t("activityExpenseAdded");
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
      case "expense_added":
        return formatCurrency(Number(item.meta));
      case "detailing_status_changed":
        return item.meta ? tDetailingStatus(item.meta as never) : null;
      default:
        return item.meta;
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-white">{tOwner("recentActivity")}</h3>

      {error ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-sm text-zinc-500">
          {tOwner("noActivity")}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
          {items.map((item) => {
            const Icon = ACTIVITY_ICONS[item.kind];
            const metaLabel = getMetaLabel(item);
            const row = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 rounded-lg bg-zinc-800/80 p-2">
                  <Icon className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      {getActionLabel(item)}
                    </p>
                    <time
                      dateTime={item.occurredAt}
                      className="shrink-0 text-xs text-zinc-500"
                    >
                      {formatDateTime(item.occurredAt)}
                    </time>
                  </div>
                  <p className="truncate text-sm text-zinc-300">{item.entityName}</p>
                  {metaLabel ? (
                    <p className="text-xs tabular-nums text-zinc-500">{metaLabel}</p>
                  ) : null}
                </div>
              </div>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block transition-colors hover:bg-zinc-800/40">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
