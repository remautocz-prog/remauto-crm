"use client";

import { useTranslations } from "next-intl";
import type { DetailingOrderStatus } from "@/lib/constants/detailing";
import { DETAILING_STATUS_STYLES } from "@/lib/detailing/status-styles";
import { cn } from "@/lib/utils";

export function DetailingStatusBadge({
  status,
  className,
}: {
  status: DetailingOrderStatus;
  className?: string;
}) {
  const t = useTranslations("detailing.status");
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        DETAILING_STATUS_STYLES[status],
        className
      )}
    >
      {t(status)}
    </span>
  );
}
