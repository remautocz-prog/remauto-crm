"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import {
  calculateOutstandingBalance,
  canMarkPaidInFull,
  inferPaidInFull,
} from "@/lib/documents/payment";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import {
  markDocumentTaskPaidAction,
  updateDocumentTaskPaymentAction,
} from "@/lib/actions/documents";
import { DocumentPaymentStatusBadge } from "@/components/documents/document-payment-status-badge";
import { Button } from "@/components/ui/button";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateDocumentPaymentStatus } from "@/lib/i18n/documents";

type DocumentTaskFinancePanelProps = {
  task: DocumentTaskWithRelations;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

export function DocumentTaskFinancePanel({ task }: DocumentTaskFinancePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [paidInFull, setPaidInFull] = useState(() => inferPaidInFull(task));

  const t = useTranslations("documents");
  const tPayment = useTranslations("documents.paymentStatus");
  const tMethods = useTranslations("documents.paymentMethods");
  const tCommon = useTranslations("common");
  const { formatCurrency, formatDateTime } = useFormatters();
  const dash = tCommon("dash");

  const finance = getDocumentFinanceSummary(task);
  const canMarkPaid = canMarkPaidInFull(task.service_price);
  const outstanding = calculateOutstandingBalance(task.service_price, task.paid_amount);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markDocumentTaskPaidAction(task.id);
      if (!result.success) {
        showToast(result.error);
        return;
      }
      setPaidInFull(true);
      showToast(t("markPaidSuccess"));
      router.refresh();
    });
  }

  function handlePaidInFullToggle(checked: boolean) {
    setPaidInFull(checked);
    startTransition(async () => {
      const result = await updateDocumentTaskPaymentAction(task.id, {
        paid_in_full: checked,
        paid_amount: checked ? Number(task.service_price) : task.paid_amount,
      });
      if (!result.success) {
        setPaidInFull(!checked);
        showToast(result.error);
        return;
      }
      showToast(checked ? t("markPaidSuccess") : t("paymentUpdated"));
      router.refresh();
    });
  }

  return (
    <>
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-green-500/30 bg-green-950 px-4 py-3 text-sm text-green-200 shadow-lg">
          {toast}
        </div>
      ) : null}
      <div className="space-y-4 text-sm">
        <InfoRow label={t("servicePrice")} value={formatCurrency(finance.servicePrice)} />
        <InfoRow label={t("costPrice")} value={formatCurrency(finance.costPrice)} />
        <InfoRow label={t("paidAmount")} value={formatCurrency(finance.paidAmount)} />
        <InfoRow label={t("outstandingBalance")} value={formatCurrency(outstanding)} />
        <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3">
          <span className="text-zinc-500">{t("paymentStatusLabel")}</span>
          <DocumentPaymentStatusBadge status={finance.paymentStatus} />
        </div>
        <InfoRow
          label={t("paymentDate")}
          value={task.paid_at ? formatDateTime(task.paid_at, dash) : dash}
        />
        <InfoRow
          label={t("paymentMethod")}
          value={
            task.payment_method
              ? tMethods(task.payment_method as "cash")
              : dash
          }
        />
        <InfoRow label={t("profit")} value={formatCurrency(finance.profit)} />

        <div className="border-t border-zinc-800/80 pt-3 space-y-3 print:hidden">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={paidInFull}
              disabled={isPending || !canMarkPaid}
              onChange={(event) => handlePaidInFullToggle(event.target.checked)}
              className="accent-red-500"
            />
            {t("paidInFull")}
          </label>
          {!canMarkPaid ? (
            <p className="text-xs text-zinc-500">{t("markPaidRequiresPrice")}</p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={isPending || !canMarkPaid || finance.paymentStatus === "paid"}
            onClick={handleMarkPaid}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("markAsPaid")}
          </Button>
          {finance.paymentStatus !== "paid" ? (
            <p className="text-xs text-zinc-500">
              {translateDocumentPaymentStatus(tPayment, finance.paymentStatus)}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
