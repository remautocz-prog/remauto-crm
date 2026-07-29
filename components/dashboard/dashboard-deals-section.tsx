"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Handshake } from "lucide-react";
import type { DealDashboardMetrics } from "@/lib/types/deals";
import { getDealsFilterHref } from "@/lib/dashboard/links";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type DashboardDealsSectionProps = {
  metrics: DealDashboardMetrics;
  error?: string;
};

export function DashboardDealsSection({ metrics, error }: DashboardDealsSectionProps) {
  const t = useTranslations("deals");
  const { formatNumber } = useFormatters();

  const cards = [
    { label: t("activeDeals"), value: metrics.activeDeals, href: getDealsFilterHref({ active: true }) },
    { label: t("unsignedPrepared"), value: metrics.unsignedPreparedDeals, href: getDealsFilterHref({ unsignedPrepared: true }) },
    { label: t("awaitingPayment"), value: metrics.awaitingPayment, href: getDealsFilterHref({ awaitingPayment: true }) },
    { label: t("overduePayments"), value: metrics.overduePayments, href: getDealsFilterHref({ overdue: true }) },
    { label: t("handoversToday"), value: metrics.handoversToday, href: getDealsFilterHref({ handoversToday: true }) },
    { label: t("completedThisMonth"), value: metrics.completedThisMonth, href: getDealsFilterHref({ completedMonth: true }) },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Handshake className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{t("deals")}</h3>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              "rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700",
              card.value > 0 && card.label === t("overduePayments") && "border-red-500/30"
            )}
          >
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatNumber(card.value)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
