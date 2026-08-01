"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2 } from "lucide-react";
import type {
  DetailingOrderStatus,
  DetailingPaymentStatus,
} from "@/lib/constants/detailing";
import { updateDetailingPaymentStatusAction } from "@/lib/actions/detailing";
import { useFormatters } from "@/lib/hooks/use-formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PAYMENT_STATUS_STYLES: Record<DetailingPaymentStatus, string> = {
  unpaid: "border-amber-600/30 bg-amber-600/10 text-amber-300",
  partially_paid: "border-blue-600/30 bg-blue-600/10 text-blue-300",
  paid: "border-emerald-600/30 bg-emerald-600/10 text-emerald-300",
};

type PaymentSnapshot = {
  payment_status: DetailingPaymentStatus;
  paid_amount: number;
  remaining_amount: number;
};

type DetailingPaymentStatusControlProps = {
  orderId: string;
  orderStatus: DetailingOrderStatus;
  paymentStatus: DetailingPaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  finalPrice: number;
  onPaymentChange?: (orderId: string, update: PaymentSnapshot) => void;
  onToast?: (toast: { message: string; type: "success" | "error" | "warning" }) => void;
  className?: string;
  compact?: boolean;
};

export function DetailingPaymentStatusControl({
  orderId,
  orderStatus,
  paymentStatus,
  paidAmount,
  remainingAmount,
  finalPrice,
  onPaymentChange,
  onToast,
  className,
  compact = false,
}: DetailingPaymentStatusControlProps) {
  const t = useTranslations("detailing.payment");
  const tStatus = useTranslations("detailing.paymentStatus");
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  const [optimistic, setOptimistic] = useState<PaymentSnapshot | null>(null);
  const [confirmUnpaidOpen, setConfirmUnpaidOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = optimistic ?? {
    payment_status: paymentStatus,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
  };

  function applyUpdate(target: "paid" | "unpaid") {
    const nextSnapshot: PaymentSnapshot =
      target === "paid"
        ? {
            payment_status: "paid",
            paid_amount: finalPrice,
            remaining_amount: 0,
          }
        : {
            payment_status: "unpaid",
            paid_amount: 0,
            remaining_amount: finalPrice,
          };

    setOptimistic(nextSnapshot);

    startTransition(async () => {
      const result = await updateDetailingPaymentStatusAction(orderId, target);
      if (!result.success || !result.data) {
        setOptimistic(null);
        onToast?.({ message: result.success ? t("invalidStatus") : result.error, type: "error" });
        return;
      }

      const { data } = result;
      setOptimistic(null);
      onPaymentChange?.(orderId, {
        payment_status: data.payment_status,
        paid_amount: data.paid_amount,
        remaining_amount: data.remaining_amount,
      });
      router.refresh();
      onToast?.({ message: t("updated"), type: "success" });
      if (data.warning) {
        onToast?.({ message: data.warning, type: "warning" });
      }
    });
  }

  function handleMarkPaid(event: Event) {
    event.preventDefault();
    if (current.payment_status === "paid" || isPending) return;
    applyUpdate("paid");
  }

  function handleMarkUnpaid(event: Event) {
    event.preventDefault();
    if (current.payment_status === "unpaid" || isPending) return;

    if (current.payment_status === "paid") {
      setConfirmUnpaidOpen(true);
      return;
    }

    applyUpdate("unpaid");
  }

  const showMarkPaid = current.payment_status !== "paid";
  const showMarkUnpaid = current.payment_status !== "unpaid";

  return (
    <>
      <div
        className={cn("inline-flex flex-col items-start gap-0.5", className)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isPending}>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
                PAYMENT_STATUS_STYLES[current.payment_status],
                isPending && "opacity-70",
                compact ? "max-w-[7.5rem]" : "max-w-[9rem]"
              )}
              aria-label={t("change")}
            >
              <span className="truncate">{tStatus(current.payment_status)}</span>
              {isPending ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
              ) : (
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            {showMarkPaid ? (
              <DropdownMenuItem onSelect={handleMarkPaid}>{t("markPaid")}</DropdownMenuItem>
            ) : null}
            {showMarkUnpaid ? (
              <DropdownMenuItem onSelect={handleMarkUnpaid}>{t("markUnpaid")}</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {current.payment_status === "partially_paid" ? (
          <p className={cn("text-[10px] leading-tight text-zinc-500", compact && "max-w-[7.5rem]")}>
            {t("partialSummary", {
              paid: formatCurrency(current.paid_amount),
              remaining: formatCurrency(current.remaining_amount),
            })}
          </p>
        ) : null}

        {orderStatus === "cancelled" ? (
          <p className="text-[10px] leading-tight text-zinc-600">{t("cancelledOrderHint")}</p>
        ) : null}
      </div>

      <AlertDialog open={confirmUnpaidOpen} onOpenChange={setConfirmUnpaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmUnpaidTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmUnpaidMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmUnpaidOpen(false);
                applyUpdate("unpaid");
              }}
            >
              {t("confirmUnpaidAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
