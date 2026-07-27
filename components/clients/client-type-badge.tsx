"use client";

import { useTranslations } from "next-intl";
import type { ClientType } from "@/lib/constants/clients";
import { translateClientType } from "@/lib/i18n/clients";
import { cn } from "@/lib/utils";

type ClientTypeBadgeProps = {
  clientType: ClientType | string;
  className?: string;
};

export function ClientTypeBadge({ clientType, className }: ClientTypeBadgeProps) {
  const t = useTranslations("clientType");

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        clientType === "company"
          ? "bg-blue-500/15 text-blue-300"
          : "bg-zinc-700/60 text-zinc-300",
        className
      )}
    >
      {translateClientType(t, clientType)}
    </span>
  );
}
