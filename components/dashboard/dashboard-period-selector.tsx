"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_PERIOD_VALUES,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import { cn } from "@/lib/utils";

type DashboardPeriodSelectorProps = {
  period: DashboardPeriod;
};

const PERIOD_LABEL_KEYS: Record<DashboardPeriod, string> = {
  today: "today",
  week: "thisWeek",
  month: "thisMonth",
  year: "thisYear",
  all: "allTime",
};

export function DashboardPeriodSelector({ period }: DashboardPeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard");

  function handleChange(next: DashboardPeriod) {
    const params = new URLSearchParams();
    if (next !== "month") {
      params.set("period", next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DASHBOARD_PERIOD_VALUES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleChange(value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            period === value
              ? "border-red-500/60 bg-red-500/15 text-red-200"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          )}
        >
          {t(PERIOD_LABEL_KEYS[value] as never)}
        </button>
      ))}
    </div>
  );
}
