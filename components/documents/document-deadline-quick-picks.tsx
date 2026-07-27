"use client";

import { useTranslations } from "next-intl";
import { addDaysToPragueDate } from "@/lib/documents/deadline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentDeadlineQuickPicksProps = {
  onSelect: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
};

export function DocumentDeadlineQuickPicks({
  onSelect,
  disabled,
  className,
  size = "sm",
}: DocumentDeadlineQuickPicksProps) {
  const t = useTranslations("documents");

  const options = [
    { key: "today", value: addDaysToPragueDate(0) },
    { key: "tomorrow", value: addDaysToPragueDate(1) },
    { key: "inThreeDays", value: addDaysToPragueDate(3) },
    { key: "inSevenDays", value: addDaysToPragueDate(7) },
  ] as const;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.key}
          type="button"
          variant="secondary"
          size={size}
          disabled={disabled}
          onClick={() => onSelect(option.value)}
        >
          {t(option.key)}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled}
        onClick={() => onSelect(null)}
      >
        {t("clearDeadline")}
      </Button>
    </div>
  );
}
