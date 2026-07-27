"use client";

import { useTranslations } from "next-intl";
import type { ClientProfileFinance } from "@/lib/clients/profile-finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

function FinanceBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; highlight?: boolean }>;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800/80 p-4">
      <h4 className="text-sm font-medium text-zinc-300">{title}</h4>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 text-sm">
          <span className="text-zinc-500">{row.label}</span>
          <span className={row.highlight ? "font-medium text-orange-400" : "text-zinc-200"}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

type ClientFinancePanelProps = {
  finance: ClientProfileFinance;
};

export function ClientFinancePanel({ finance }: ClientFinancePanelProps) {
  const t = useTranslations("clients");
  const tDocuments = useTranslations("documents");
  const { formatCurrency } = useFormatters();

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("clientFinance")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <FinanceBlock
          title={t("documentFinance")}
          rows={[
            { label: t("totalRevenue"), value: formatCurrency(finance.documents.revenue) },
            { label: tDocuments("costPrice"), value: formatCurrency(finance.documents.costs) },
            { label: t("totalProfit"), value: formatCurrency(finance.documents.profit) },
            { label: t("totalPaid"), value: formatCurrency(finance.documents.paid) },
            {
              label: t("outstandingBalance"),
              value: formatCurrency(finance.documents.outstanding),
              highlight: finance.documents.outstanding > 0,
            },
          ]}
        />
        <FinanceBlock
          title={t("vehicleFinance")}
          rows={[
            { label: t("totalRevenue"), value: formatCurrency(finance.vehicles.revenue) },
            { label: tDocuments("costPrice"), value: formatCurrency(finance.vehicles.costs) },
            { label: t("totalProfit"), value: formatCurrency(finance.vehicles.profit) },
          ]}
        />
        <FinanceBlock
          title={t("combinedFinance")}
          rows={[
            { label: t("totalRevenue"), value: formatCurrency(finance.combined.revenue) },
            { label: tDocuments("costPrice"), value: formatCurrency(finance.combined.costs) },
            { label: t("totalProfit"), value: formatCurrency(finance.combined.profit) },
            { label: t("totalPaid"), value: formatCurrency(finance.combined.documentPaid) },
            {
              label: t("outstandingBalance"),
              value: formatCurrency(finance.combined.outstanding),
              highlight: finance.combined.outstanding > 0,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
