"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  DETAILING_ORDER_STATUSES,
  type DetailingOrderStatus,
} from "@/lib/constants/detailing";
import { changeDetailingOrderStatusAction } from "@/lib/actions/detailing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<DetailingOrderStatus, string> = {
  scheduled: "border-blue-600/30 bg-blue-600/10 text-blue-300",
  in_progress: "border-yellow-600/30 bg-yellow-600/10 text-yellow-300",
  ready: "border-emerald-600/30 bg-emerald-600/10 text-emerald-300",
  delivered: "border-green-600/30 bg-green-600/10 text-green-400",
  cancelled: "border-zinc-600/30 bg-zinc-800 text-zinc-400",
};

type DetailingInlineStatusSelectProps = {
  orderId: string;
  status: DetailingOrderStatus;
  onStatusChange?: (orderId: string, status: DetailingOrderStatus) => void;
  onToast?: (toast: { message: string; type: "success" | "error" }) => void;
  className?: string;
};

export function DetailingInlineStatusSelect({
  orderId,
  status,
  onStatusChange,
  onToast,
  className,
}: DetailingInlineStatusSelectProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<DetailingOrderStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("detailing.status");
  const value = optimisticStatus ?? status;

  function handleChange(next: string) {
    const nextStatus = next as DetailingOrderStatus;
    if (nextStatus === value) return;

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
      onToast?.({ message: t("updated"), type: "success" });
    });
  }

  return (
    <div className={cn("relative inline-flex min-w-[10rem] items-center gap-2", className)}>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          className={cn("h-8 border text-xs font-medium", STATUS_STYLES[value], isPending && "opacity-70")}
          aria-label={t("change")}
        >
          <SelectValue>{t(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DETAILING_ORDER_STATUSES.map((statusOption) => (
            <SelectItem key={statusOption} value={statusOption}>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_STYLES[statusOption]
                )}
              >
                {t(statusOption)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" aria-hidden />
      ) : null}
    </div>
  );
}
