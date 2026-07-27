"use client";

import { useTranslations } from "next-intl";
import type { ClientProfileFinance } from "@/lib/clients/profile-finance";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type ClientSummaryCardsProps = {
  finance: ClientProfileFinance;
};

export function ClientSummaryCards({ finance }: ClientSummaryCardsProps) {
  const t = useTranslations("clients");
  const { formatNumber, formatCurrency } = useFormatters();

  const items = [
    { label: t("vehiclesCount"), value: formatNumber(finance.vehiclesCount) },
    { label: t("activeDocumentOrders"), value: formatNumber(finance.activeDocumentOrders) },
    { label: t("totalRevenue"), value: formatCurrency(finance.combined.revenue) },
    { label: t("totalPaid"), value: formatCurrency(finance.combined.documentPaid) },
    { label: t("outstandingBalance"), value: formatCurrency(finance.combined.outstanding) },
    { label: t("totalProfit"), value: formatCurrency(finance.combined.profit) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
