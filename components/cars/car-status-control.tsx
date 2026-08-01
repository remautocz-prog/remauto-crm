"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2 } from "lucide-react";
import type { Car, ClientOption } from "@/lib/types/cars";
import {
  CAR_STATUS_VALUES,
  type CarStatusValue,
} from "@/lib/constants/cars";
import { CAR_STATUS_SOLD } from "@/lib/constants/status";
import { changeCarStatusAction } from "@/lib/actions/cars";
import { CAR_STATUS_STYLES } from "@/lib/cars/status-styles";
import { MarkSoldDialog } from "@/components/cars/mark-sold-dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translateStatus } from "@/lib/i18n/status";
import { cn } from "@/lib/utils";

type ConfirmKind = "revert";

type CarStatusControlProps = {
  car: Car;
  clients?: ClientOption[];
  onStatusChange?: (carId: number, status: CarStatusValue) => void;
  onToast?: (toast: { message: string; type: "success" | "error" }) => void;
  className?: string;
  compact?: boolean;
};

export function CarStatusControl({
  car,
  clients = [],
  onStatusChange,
  onToast,
  className,
  compact = false,
}: CarStatusControlProps) {
  const t = useTranslations("cars.status");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState<CarStatusValue | null>(null);
  const [pendingStatus, setPendingStatus] = useState<CarStatusValue | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [markSoldOpen, setMarkSoldOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = (optimisticStatus ?? car.status) as CarStatusValue;

  function applyStatus(nextStatus: CarStatusValue) {
    setOptimisticStatus(nextStatus);

    startTransition(async () => {
      const result = await changeCarStatusAction(car.id, nextStatus);

      if (!result.success) {
        setOptimisticStatus(null);
        onToast?.({ message: result.error, type: "error" });
        return;
      }

      setOptimisticStatus(null);
      onStatusChange?.(car.id, nextStatus);
      router.refresh();
      onToast?.({ message: t("updated"), type: "success" });
    });
  }

  function requestStatusChange(nextStatus: CarStatusValue) {
    if (nextStatus === current || isPending) return;

    if (nextStatus === CAR_STATUS_SOLD) {
      setMarkSoldOpen(true);
      return;
    }

    if (current === CAR_STATUS_SOLD) {
      setPendingStatus(nextStatus);
      setConfirmKind("revert");
      return;
    }

    applyStatus(nextStatus);
  }

  function handleMenuSelect(nextStatus: CarStatusValue) {
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
                CAR_STATUS_STYLES[current] ?? CAR_STATUS_STYLES.in_stock,
                isPending && "opacity-70",
                compact ? "max-w-[8.5rem]" : "max-w-[10rem]"
              )}
              aria-label={t("change")}
            >
              <span className="truncate">{translateStatus(tStatus, current)}</span>
              {isPending ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
              ) : (
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuLabel className="text-xs text-zinc-500">
              {t("change")}
            </DropdownMenuLabel>
            {CAR_STATUS_VALUES.filter((option) => option !== current).map((option) => (
              <DropdownMenuItem key={option} onSelect={handleMenuSelect(option)}>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                    CAR_STATUS_STYLES[option]
                  )}
                >
                  {translateStatus(tStatus, option)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <MarkSoldDialog
        car={car}
        clients={clients}
        open={markSoldOpen}
        onOpenChange={setMarkSoldOpen}
        onSold={() => {
          onStatusChange?.(car.id, CAR_STATUS_SOLD);
          onToast?.({ message: t("updated"), type: "success" });
        }}
      />

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
