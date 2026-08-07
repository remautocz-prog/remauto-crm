"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  Car,
  FileText,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DocumentInlineStatusSelect } from "@/components/documents/document-inline-status-select";
import { DetailingOrderStatusControl } from "@/components/detailing/order-status-control";
import { DetailingPaymentStatusControl } from "@/components/detailing/order-payment-status-control";
import type {
  OwnerAttentionPriority,
  OwnerAttentionRow,
} from "@/lib/dashboard/owner-attention";
import type { OwnerAttentionLoadResult } from "@/lib/queries/owner-attention";
import { cn } from "@/lib/utils";

type OwnerAttentionSectionProps = {
  attention: OwnerAttentionLoadResult;
  quickActions: {
    documentsStatus: boolean;
    detailingPayment: boolean;
    detailingStatus: boolean;
    carsStatus: boolean;
  };
  translationNamespace?: "dashboard.owner" | "dashboard.admin";
  sectionId?: string;
  limit?: number;
};

const MODULE_ICONS = {
  documents: FileText,
  detailing: Sparkles,
  cars: Car,
} as const;

const PRIORITY_STYLES: Record<
  OwnerAttentionPriority,
  { badge: string; row: string }
> = {
  critical: {
    badge: "bg-red-500/15 text-red-200",
    row: "border-red-500/25 bg-red-950/10",
  },
  high: {
    badge: "bg-amber-500/15 text-amber-200",
    row: "border-amber-500/25 bg-amber-950/10",
  },
  medium: {
    badge: "bg-sky-500/15 text-sky-200",
    row: "border-sky-500/20 bg-zinc-950/40",
  },
};

function AttentionSummaryChips({
  summary,
  t,
}: {
  summary: OwnerAttentionLoadResult["summary"];
  t: ReturnType<typeof useTranslations<"dashboard.owner" | "dashboard.admin">>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-red-500/25 bg-red-950/20 px-2.5 py-1 text-xs tabular-nums text-red-200">
        {t("attentionCritical")}: {summary.critical}
      </span>
      <span className="rounded-full border border-amber-500/25 bg-amber-950/20 px-2.5 py-1 text-xs tabular-nums text-amber-200">
        {t("attentionHighPriority")}: {summary.high}
      </span>
      <span className="rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-xs tabular-nums text-zinc-300">
        {t("attentionUnresolved")}: {summary.total}
      </span>
    </div>
  );
}

function AttentionRow({
  item,
  quickActions,
  t,
}: {
  item: OwnerAttentionRow;
  quickActions: OwnerAttentionSectionProps["quickActions"];
  t: ReturnType<typeof useTranslations<"dashboard.owner" | "dashboard.admin">>;
}) {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);
  const Icon = MODULE_ICONS[item.module];
  const styles = PRIORITY_STYLES[item.priority];

  const reason = item.reasonParams?.highPriority
    ? t("attentionReasonDocumentOverdueHighPriority", {
        days: item.reasonParams.days ?? 0,
      })
    : t(item.reasonKey as never, item.reasonParams as never);

  const priorityLabel =
    item.priority === "critical"
      ? t("attentionCritical")
      : item.priority === "high"
        ? t("attentionHighPriority")
        : t("attentionMediumPriority");

  const showDocumentStatus =
    quickActions.documentsStatus && item.module === "documents" && item.documentTask;
  const showDetailingPayment =
    quickActions.detailingPayment &&
    item.module === "detailing" &&
    item.detailingOrder &&
    (item.reasonCategory === "detailing_unpaid" ||
      item.reasonCategory === "detailing_partially_paid");
  const showDetailingStatus =
    quickActions.detailingStatus &&
    item.module === "detailing" &&
    item.detailingOrder &&
    (item.reasonCategory === "detailing_ready" ||
      item.reasonCategory === "detailing_ready_waiting" ||
      item.reasonCategory === "detailing_overdue_completion");

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border transition-colors",
        styles.row
      )}
    >
      <Link
        href={item.href}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
        aria-label={`${item.title} — ${reason}`}
      />

      <div className="relative z-10 flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pointer-events-none">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60">
              <Icon className="h-4 w-4 text-zinc-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    styles.badge
                  )}
                >
                  {priorityLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-400">{item.subtitle}</p>
              <p className="mt-2 text-xs text-zinc-300">{reason}</p>
            </div>
          </div>
        </div>

        {(showDocumentStatus || showDetailingPayment || showDetailingStatus) && (
          <div
            className="relative z-20 shrink-0 pointer-events-auto"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {showDocumentStatus && item.documentTask ? (
              <DocumentInlineStatusSelect
                taskId={item.documentTask.id}
                status={item.documentTask.status}
                onToast={setToast}
                className="min-w-[9.5rem]"
              />
            ) : null}
            {showDetailingPayment && item.detailingOrder ? (
              <DetailingPaymentStatusControl
                orderId={item.detailingOrder.id}
                orderStatus={item.detailingOrder.status}
                paymentStatus={item.detailingOrder.payment_status}
                finalPrice={item.detailingOrder.final_price}
                paidAmount={item.detailingOrder.paid_amount}
                remainingAmount={item.detailingOrder.remaining_amount}
                compact
              />
            ) : null}
            {showDetailingStatus && item.detailingOrder ? (
              <DetailingOrderStatusControl
                orderId={item.detailingOrder.id}
                status={item.detailingOrder.status}
                compact
                onToast={setToast}
              />
            ) : null}
          </div>
        )}
      </div>

      {toast ? (
        <p
          className={cn(
            "relative z-20 px-4 pb-3 text-xs",
            toast.type === "success" ? "text-emerald-300" : "text-red-300"
          )}
        >
          {toast.message}
        </p>
      ) : null}
    </article>
  );
}

export function OwnerAttentionSection({
  attention,
  quickActions,
  translationNamespace = "dashboard.owner",
  sectionId = "attention",
  limit,
}: OwnerAttentionSectionProps) {
  const t = useTranslations(translationNamespace);
  const moduleErrors = Object.values(attention.errors).some(Boolean);

  return (
    <section id={sectionId} className="mt-8 scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-white">{t("requiresAttention")}</h2>
            <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{t("currentUnresolvedItems")}</p>
        </div>
        <AttentionSummaryChips summary={attention.summary} t={t} />
      </div>

      {moduleErrors ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
          {t("attentionPartialLoadFailed")}
        </p>
      ) : null}

      {attention.items.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 py-5 text-sm text-emerald-200">
          {t("attentionEmptyState")}
        </div>
      ) : (
        <ul className="space-y-2">
          {(limit ? attention.items.slice(0, limit) : attention.items).map((item) => (
            <li key={item.id}>
              <AttentionRow item={item} quickActions={quickActions} t={t} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
