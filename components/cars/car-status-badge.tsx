"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { translateStatus } from "@/lib/i18n/status";
import { cn } from "@/lib/utils";

export function CarStatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-zinc-700 text-zinc-200",
        status === "sold" && "border-red-600/40 bg-red-600/10 text-red-400",
        status === "in_stock" && "border-green-600/30 bg-green-600/10 text-green-400",
        status === "reserved" && "border-yellow-600/30 bg-yellow-600/10 text-yellow-300"
      )}
    >
      {translateStatus(t, status)}
    </Badge>
  );
}
