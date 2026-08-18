"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ArchivedBadge({ className }: { className?: string }) {
  const t = useTranslations("archive");

  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-zinc-600/60 bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-300",
        className
      )}
    >
      {t("archived")}
    </span>
  );
}
