"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { canMarkPaidInFull } from "@/lib/documents/payment";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { markDocumentTaskPaidAction } from "@/lib/actions/documents";
import { DocumentPaymentStatusBadge } from "@/components/documents/document-payment-status-badge";
import { Button } from "@/components/ui/button";

type DocumentQuickPayControlProps = {
  task: DocumentTaskWithRelations;
  compact?: boolean;
};

export function DocumentQuickPayControl({ task, compact }: DocumentQuickPayControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("documents");
  const finance = getDocumentFinanceSummary(task);

  if (finance.paymentStatus === "paid") {
    return <DocumentPaymentStatusBadge status="paid" />;
  }

  const canMark = canMarkPaidInFull(task.service_price);

  function handleClick() {
    if (!canMark) return;
    if (!window.confirm(t("confirmMarkPaid"))) return;
    startTransition(async () => {
      const result = await markDocumentTaskPaidAction(task.id);
      if (result.success) {
        router.refresh();
      } else {
        window.alert(result.error);
      }
    });
  }

  if (compact) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending || !canMark}
        onClick={handleClick}
        title={!canMark ? t("markPaidRequiresPrice") : undefined}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t("quickPaid")}
      </Button>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
      <input
        type="checkbox"
        disabled={isPending || !canMark}
        onChange={handleClick}
        className="accent-green-500"
        title={!canMark ? t("markPaidRequiresPrice") : t("confirmMarkPaid")}
      />
      {t("quickPaid")}
    </label>
  );
}
