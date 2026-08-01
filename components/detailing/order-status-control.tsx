"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  DETAILING_ORDER_STATUSES,
  type DetailingOrderStatus,
} from "@/lib/constants/detailing";
import { changeDetailingOrderStatusAction } from "@/lib/actions/detailing";
import {
  DETAILING_STATUS_NEXT,
  DETAILING_STATUS_STYLES,
} from "@/lib/detailing/status-styles";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ConfirmKind = "cancel" | "revert";

type DetailingOrderStatusControlProps = {
  orderId: string;
  status: DetailingOrderStatus;
  onStatusChange?: (orderId: string, status: DetailingOrderStatus) => void;
  onToast?: (toast: { message: string; type: "success" | "error" | "warning" }) => void;
  className?: string;
  compact?: boolean;
};

function getQuickActionKey(target: DetailingOrderStatus): "startWork" | "markReady" | "markDelivered" | null {
  switch (target) {
    case "in_progress":
      return "startWork";
    case "ready":
      return "markReady";
    case "delivered":
      return "markDelivered";
    default:
      return null;
  }
}

export function DetailingOrderStatusControl({
  orderId,
  status,
  onStatusChange,
  onToast,
  className,
  compact = false,
}: DetailingOrderStatusControlProps) {
  const t = useTranslations("detailing.status");
  const tActions = useTranslations("detailing.actions");
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState<DetailingOrderStatus | null>(null);
  const [pendingStatus, setPendingStatus] = useState<DetailingOrderStatus | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = optimisticStatus ?? status;
  const quickNext = DETAILING_STATUS_NEXT[current];
  const quickActionKey = quickNext ? getQuickActionKey(quickNext) : null;

  function applyStatus(nextStatus: DetailingOrderStatus) {
    setOptimisticStatus(nextStatus);

    startTransition(async () => {
      const result = await changeDetailingOrderStatusAction(orderId, nextStatus);

      if (!result.success) {
        setOptimisticStatus(null);
        onToast?.({ message: result.error, type: "error" });
        return;
      }

      setOptimisticStatus(null);
      onStatusChange?.(orderId, nextStatus);
      router.refresh();
      onToast?.({ message: t("updated"), type: "success" });
    });
  }

  function requestStatusChange(nextStatus: DetailingOrderStatus) {
    if (nextStatus === current || isPending) return;

    if (nextStatus === "cancelled") {
      setPendingStatus(nextStatus);
      setConfirmKind("cancel");
      return;
    }

    if (current === "delivered" && nextStatus !== "delivered") {
      setPendingStatus(nextStatus);
      setConfirmKind("revert");
      return;
    }

    applyStatus(nextStatus);
  }

  function handleMenuSelect(nextStatus: DetailingOrderStatus) {
    return (event: Event) => {
      event.preventDefault();
      requestStatusChange(nextStatus);
    };
  }

  function closeConfirmDialog() {
    setConfirmKind(null);
    setPendingStatus(null);
  }

  function confirmPending() {
    if (!pendingStatus || !confirmKind) return;
    applyStatus(pendingStatus);
    closeConfirmDialog();
  }

  return (
    <>
      <div
        className={cn("inline-flex items-center", className)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isPending}>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
                DETAILING_STATUS_STYLES[current],
                isPending && "opacity-70",
                compact ? "max-w-[8.5rem]" : "max-w-[10rem]"
              )}
              aria-label={t("change")}
            >
              <span className="truncate">{t(current)}</span>
              {isPending ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
              ) : (
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            {quickNext && quickActionKey ? (
              <>
                <DropdownMenuItem
                  onSelect={handleMenuSelect(quickNext)}
                  className="font-medium text-white"
                >
                  {tActions(quickActionKey)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuLabel className="text-xs text-zinc-500">{t("allStatuses")}</DropdownMenuLabel>
            {DETAILING_ORDER_STATUSES.filter((option) => option !== current).map((option) => (
              <DropdownMenuItem key={option} onSelect={handleMenuSelect(option)}>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                    DETAILING_STATUS_STYLES[option]
                  )}
                >
                  {t(option)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={confirmKind === "cancel"}
        onOpenChange={(open) => {
          if (!open) closeConfirmDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmCancelMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>{t("confirmCancelAction")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmKind === "revert"}
        onOpenChange={(open) => {
          if (!open) closeConfirmDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmRevertTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmRevertMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>{t("confirmRevertAction")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
