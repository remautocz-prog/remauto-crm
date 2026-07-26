"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { translateBusinessModelShort } from "@/lib/i18n/business-model";
import { DEFAULT_BUSINESS_MODEL } from "@/lib/constants/business-model";
import { cn } from "@/lib/utils";

export function BusinessModelBadge({
  businessModel,
}: {
  businessModel?: string | null;
}) {
  const model = businessModel ?? DEFAULT_BUSINESS_MODEL;
  const t = useTranslations("businessModel.short");

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-zinc-700 text-zinc-200",
        model === "owned" && "border-blue-600/30 bg-blue-600/10 text-blue-300",
        model === "commission" &&
          "border-purple-600/30 bg-purple-600/10 text-purple-300",
        model === "client_order" &&
          "border-amber-600/30 bg-amber-600/10 text-amber-300"
      )}
    >
      {translateBusinessModelShort(t, model)}
    </Badge>
  );
}
