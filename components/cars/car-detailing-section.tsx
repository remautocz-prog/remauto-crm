"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import { DetailingStatusBadge } from "@/components/detailing/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type CarDetailingSectionProps = {
  carId: number;
  orders: DetailingOrderWithServices[];
};

export function CarDetailingSection({ carId, orders }: CarDetailingSectionProps) {
  const t = useTranslations("cars");
  const { formatCurrency, formatDate } = useFormatters();

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base text-white">{t("relatedDetailingOrders")}</CardTitle>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/detailing/orders/new?car_id=${carId}`}>
            <Sparkles className="h-4 w-4" />
            {t("sendToDetailing")}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noRelatedDetailingOrders")}</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/detailing/orders/${order.id}`}
                  className="flex flex-col gap-2 py-3 transition-colors hover:bg-zinc-950/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-200">{order.order_number}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(order.appointment_date)} · {order.vehicle_make_model}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <DetailingStatusBadge status={order.status} />
                    <span className="text-sm tabular-nums text-zinc-300">
                      {formatCurrency(order.final_price)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
