"use client";

import { useTranslations } from "next-intl";
import { translateDocumentPaymentStatus } from "@/lib/i18n/documents";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  unpaid: "bg-red-500/15 text-red-300",
  partially_paid: "bg-amber-500/15 text-amber-300",
  paid: "bg-green-500/15 text-green-300",
};

export function DocumentPaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useTranslations("documents.paymentStatus");
  const normalized =
    status === "paid" || status === "partially_paid" || status === "unpaid"
      ? status
      : "unpaid";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[normalized],
        className
      )}
    >
      {translateDocumentPaymentStatus(t, normalized)}
    </span>
  );
}
