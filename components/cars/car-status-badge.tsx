"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { translateStatus } from "@/lib/i18n/status";
import { CAR_STATUS_STYLES } from "@/lib/cars/status-styles";
import type { CarStatusValue } from "@/lib/constants/cars";
import { cn } from "@/lib/utils";

export function CarStatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  const styleKey = status as CarStatusValue;

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-zinc-700 text-zinc-200",
        CAR_STATUS_STYLES[styleKey] ?? CAR_STATUS_STYLES.in_stock
      )}
    >
      {translateStatus(t, status)}
    </Badge>
  );
}
