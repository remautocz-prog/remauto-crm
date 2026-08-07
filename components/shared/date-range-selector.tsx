"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange, Loader2 } from "lucide-react";
import type { DateRangePreset } from "@/lib/date-range/filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

const PRESETS: DateRangePreset[] = ["today", "week", "month", "year", "custom"];

const controlFocusClass =
  "focus:outline-none focus:ring-2 focus:ring-zinc-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40";

type DateRangeSelectorProps = {
  from: string;
  to: string;
  preset: DateRangePreset;
  className?: string;
};

export function DateRangeSelector({
  from,
  to,
  preset,
  className,
}: DateRangeSelectorProps) {
  const t = useTranslations("dateRange");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [draftPreset, setDraftPreset] = useState<DateRangePreset>(preset);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const dash = tCommon("dash");
  const showCustomFields = draftPreset === "custom";

  const formattedRange = useMemo(
    () => `${formatDate(from, dash)} – ${formatDate(to, dash)}`,
    [dash, formatDate, from, to]
  );

  const presetTitle = useMemo(() => {
    if (preset === "custom") {
      return t("preset.custom");
    }
    return t(`preset.${preset}` as "preset.today");
  }, [preset, t]);

  const isDefaultPeriod =
    preset === "month" &&
    !searchParams.get("from") &&
    !searchParams.get("to") &&
    (searchParams.get("preset") === null || searchParams.get("preset") === "month") &&
    (searchParams.get("period") === null || searchParams.get("period") === "month");

  const isInvalidDraft =
    showCustomFields &&
    Boolean(draftFrom && draftTo && draftFrom > draftTo);

  function pushRange(next: { from: string; to: string; preset: DateRangePreset }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", next.from);
    params.set("to", next.to);
    params.set("preset", next.preset);
    params.delete("period");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleApply() {
    if (draftPreset === "custom") {
      pushRange({ from: draftFrom, to: draftTo, preset: "custom" });
      return;
    }
    pushRange({ from: draftFrom, to: draftTo, preset: draftPreset });
  }

  function handlePresetChange(value: DateRangePreset) {
    setDraftPreset(value);
    if (value !== "custom") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("preset", value);
      params.delete("from");
      params.delete("to");
      params.delete("period");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }
  }

  function handleReset() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.delete("period");
    params.set("preset", "month");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-3 shadow-sm shadow-black/20 ring-1 ring-inset ring-white/[0.03] sm:px-4",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <CalendarRange
            className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {t("selectedPeriod")}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-100">
              {preset === "custom" ? formattedRange : `${presetTitle} · ${formattedRange}`}
            </p>
            {preset === "custom" ? (
              <p className="truncate text-xs text-zinc-500">{presetTitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0">
          <div className="min-w-[9.5rem] flex-1 sm:flex-none">
            <Label htmlFor="date-range-preset" className="sr-only">
              {t("presetLabel")}
            </Label>
            <Select
              value={draftPreset}
              onValueChange={(value) => handlePresetChange(value as DateRangePreset)}
              disabled={isPending}
            >
              <SelectTrigger
                id="date-range-preset"
                className={cn(
                  "h-9 border-zinc-800/90 bg-zinc-950/70 text-sm hover:bg-zinc-900/80",
                  controlFocusClass
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`preset.${item}` as "preset.today")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isDefaultPeriod ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="shrink-0 px-1 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
            >
              {t("resetPeriod")}
            </button>
          ) : null}

          {isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-500" aria-hidden />
          ) : null}
        </div>
      </div>

      {showCustomFields ? (
        <div className="mt-3 border-t border-zinc-800/60 pt-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="date-from" className="text-xs text-zinc-500">
                {t("from")}
              </Label>
              <Input
                id="date-from"
                type="date"
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
                disabled={isPending}
                aria-invalid={isInvalidDraft}
                className={cn(
                  "h-9 border-zinc-800/90 bg-zinc-950/70 text-sm",
                  controlFocusClass,
                  isInvalidDraft && "border-red-500/50 focus:ring-red-500/30"
                )}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="date-to" className="text-xs text-zinc-500">
                {t("to")}
              </Label>
              <Input
                id="date-to"
                type="date"
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
                disabled={isPending}
                aria-invalid={isInvalidDraft}
                className={cn(
                  "h-9 border-zinc-800/90 bg-zinc-950/70 text-sm",
                  controlFocusClass,
                  isInvalidDraft && "border-red-500/50 focus:ring-red-500/30"
                )}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApply}
              disabled={isPending}
              className="h-9 shrink-0 px-4"
            >
              {t("apply")}
            </Button>
          </div>
          {isInvalidDraft ? (
            <p className="mt-2 text-xs text-red-400/90" role="alert">
              {t("invalidRange")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
