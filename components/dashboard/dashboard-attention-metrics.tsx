"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  Flame,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import type { DashboardAttentionMetrics } from "@/lib/types/dashboard";
import { getDocumentsFilterHref } from "@/lib/dashboard/links";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardAttentionMetricsProps = {
  metrics: DashboardAttentionMetrics;
  error?: string;
};

type AttentionCardConfig = {
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
  accent?: string;
  iconAccent?: string;
  className?: string;
};

export function DashboardAttentionMetrics({
  metrics,
  error,
}: DashboardAttentionMetricsProps) {
  const t = useTranslations("dashboard");
  const { formatCurrency, formatNumber } = useFormatters();

  const cards: AttentionCardConfig[] = [
    {
      label: t("overdueOrders"),
      value: formatNumber(metrics.overdueOrders),
      href: getDocumentsFilterHref({ overdue: true }),
      icon: AlertTriangle,
      accent: metrics.overdueOrders > 0 ? "border-red-500/30 bg-red-950/10" : "",
      iconAccent: metrics.overdueOrders > 0 ? "text-red-400/80" : "text-zinc-500",
    },
    {
      label: t("dueTodayOrders"),
      value: formatNumber(metrics.dueTodayOrders),
      href: getDocumentsFilterHref({ dueToday: true }),
      icon: Calendar,
      accent: metrics.dueTodayOrders > 0 ? "border-orange-500/30 bg-orange-950/10" : "",
      iconAccent: metrics.dueTodayOrders > 0 ? "text-orange-400/80" : "text-zinc-500",
    },
    {
      label: t("urgentActiveOrders"),
      value: formatNumber(metrics.urgentActiveOrders),
      href: getDocumentsFilterHref({ priority: "urgent" }),
      icon: Flame,
      accent: metrics.urgentActiveOrders > 0 ? "border-amber-500/30 bg-amber-950/10" : "",
      iconAccent: metrics.urgentActiveOrders > 0 ? "text-amber-400/80" : "text-zinc-500",
    },
    {
      label: t("unassignedActiveOrders"),
      value: formatNumber(metrics.unassignedActiveOrders),
      href: getDocumentsFilterHref({ unassignedOnly: true }),
      icon: UserMinus,
      iconAccent: "text-zinc-500",
    },
    {
      label: t("unpaidDocumentBalance"),
      value: formatCurrency(metrics.unpaidDocumentBalance),
      href: getDocumentsFilterHref({ paymentOutstanding: true }),
      icon: CreditCard,
      accent:
        metrics.unpaidDocumentBalance > 0 ? "border-yellow-500/30 bg-yellow-950/10" : "",
      iconAccent:
        metrics.unpaidDocumentBalance > 0 ? "text-yellow-400/80" : "text-zinc-500",
      className: "col-span-2 sm:col-span-1",
    },
  ];

  if (error) {
    return <DashboardAttentionMetricsError error={error} title={t("attentionRequired")} />;
  }

  return (
    <section className="space-y-3" aria-labelledby="dashboard-attention-heading">
      <h3 id="dashboard-attention-heading" className="text-base font-semibold text-white">
        {t("attentionRequired")}
      </h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <AttentionCard key={card.label} card={card} />
        ))}
      </div>
    </section>
  );
}

function AttentionCard({ card }: { card: AttentionCardConfig }) {
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      className={cn(
        "group block min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition-colors sm:p-4",
        "hover:border-zinc-600 hover:bg-zinc-900/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        card.accent,
        card.className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">{card.label}</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
            {card.value}
          </p>
        </div>
        <Icon
          className={cn("mt-0.5 h-4 w-4 shrink-0", card.iconAccent)}
          aria-hidden
        />
      </div>
    </Link>
  );
}

function DashboardAttentionMetricsError({
  title,
  error,
}: {
  title: string;
  error: string;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard");

  return (
    <section className="space-y-3" aria-labelledby="dashboard-attention-error-heading">
      <h3 id="dashboard-attention-error-heading" className="text-base font-semibold text-white">
        {title}
      </h3>
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-red-200">{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.refresh()}
            >
              {t("retry")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
