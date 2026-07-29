"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DealWithRelations } from "@/lib/types/deals";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getVehicleLabelFromSnapshot } from "@/lib/deals/snapshots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DealsSectionProps = {
  deals: DealWithRelations[];
  createHref?: string;
};

export function DealsSection({ deals, createHref }: DealsSectionProps) {
  const t = useTranslations("deals");
  const tStatus = useTranslations("deals.status");
  const { formatCurrency, formatDate } = useFormatters();

  function vehicleSummary(deal: DealWithRelations) {
    const a = deal.vehicle_a
      ? `${deal.vehicle_a.brand} ${deal.vehicle_a.model}`.trim()
      : getVehicleLabelFromSnapshot(deal.vehicle_a_snapshot);
    const b = deal.vehicle_b
      ? `${deal.vehicle_b.brand} ${deal.vehicle_b.model}`.trim()
      : getVehicleLabelFromSnapshot(deal.vehicle_b_snapshot);
    return [a, b].filter(Boolean).join(" ↔ ");
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base text-white">{t("deals")}</CardTitle>
        {createHref ? (
          <Button asChild size="sm">
            <Link href={createHref}>{t("newDeal")}</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {deals.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("noDeals")}</p>
        ) : (
          <ul className="space-y-2">
            {deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/deals/${deal.id}`} className="block rounded-md border border-zinc-800/80 p-3 text-sm hover:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white">{deal.deal_number}</span>
                    <div className="flex gap-2">
                      {deal.archived_at ? (
                        <span className="text-xs text-zinc-500">{t("archivedBadge")}</span>
                      ) : null}
                      <span className="text-xs text-zinc-500">{tStatus(deal.status)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">{vehicleSummary(deal)}</p>
                  <p className="text-xs text-zinc-400">
                    {deal.additional_payment
                      ? `${formatCurrency(deal.additional_payment)} ${deal.currency}`
                      : t("noAdditionalPayment")}
                    {deal.signing_date ? ` · ${formatDate(deal.signing_date)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
