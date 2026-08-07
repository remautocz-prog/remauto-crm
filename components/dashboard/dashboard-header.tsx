"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Car, FileText, Sparkles, UserPlus } from "lucide-react";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import { DASHBOARD_QUICK_ACTION_LINKS } from "@/lib/dashboard/links";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  userName?: string | null;
  title?: string;
};

export function DashboardHeader({ userName, title }: DashboardHeaderProps) {
  const t = useTranslations("dashboard");
  const tOwner = useTranslations("dashboard.owner");
  const { formatDate } = useFormatters();
  const today = getPragueTodayDateString();

  const quickActions = [
    {
      href: DASHBOARD_QUICK_ACTION_LINKS.newCar,
      label: t("newCar"),
      icon: Car,
    },
    {
      href: DASHBOARD_QUICK_ACTION_LINKS.newDetailingOrder,
      label: tOwner("newDetailingOrder"),
      icon: Sparkles,
    },
    {
      href: DASHBOARD_QUICK_ACTION_LINKS.newClient,
      label: t("newClient"),
      icon: UserPlus,
    },
    {
      href: DASHBOARD_QUICK_ACTION_LINKS.newDocumentOrder,
      label: t("newDocumentOrder"),
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {title ?? (userName ? `${t("welcome")}, ${userName}` : t("dashboardOverview"))}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{formatDate(today)}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("quickActions")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant="outline"
              size="sm"
              className="h-auto justify-start gap-2 border-zinc-700 px-3 py-2 text-left"
            >
              <Link href={action.href}>
                <action.icon className="h-4 w-4 shrink-0 text-red-400" />
                <span className="text-xs sm:text-sm">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
