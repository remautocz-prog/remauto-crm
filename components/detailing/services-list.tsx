"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { updateDetailingServiceAction } from "@/lib/actions/detailing";
import { getDetailingServiceName, formatDetailingServicePrice } from "@/lib/detailing/service-labels";
import { isValidLocale, type AppLocale } from "@/i18n/config";
import type { DetailingService } from "@/lib/types/detailing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingServicesListProps = {
  services: DetailingService[];
};

export function DetailingServicesList({ services }: DetailingServicesListProps) {
  const t = useTranslations("detailing");
  const rawLocale = useLocale();
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";
  const { formatCurrency } = useFormatters();
  const [isPending, startTransition] = useTransition();

  function toggleActive(service: DetailingService) {
    startTransition(async () => {
      await updateDetailingServiceAction({ id: service.id, active: !service.active });
    });
  }

  const grouped = services.reduce<Partial<Record<DetailingService["category"], DetailingService[]>>>(
    (acc, service) => {
      acc[service.category] = acc[service.category] ?? [];
      acc[service.category]!.push(service);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{t("servicesTitle")}</h2>
        <p className="text-sm text-zinc-400">{t("servicesDescription")}</p>
      </div>

      {(Object.entries(grouped) as Array<[DetailingService["category"], DetailingService[]]>).map(
        ([category, items]) => (
        <Card key={category}>
          <CardHeader><CardTitle>{t(`categories.${category}` as `categories.${DetailingService["category"]}`)}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.map((service) => (
              <div key={service.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{getDetailingServiceName(service, locale)}</p>
                  <p className="text-sm text-zinc-500">
                    {formatDetailingServicePrice(service, formatCurrency, {
                      from: t("priceLabels.from"),
                      range: t("priceLabels.range"),
                      perItem: t("priceLabels.perItem"),
                      onRequest: t("priceLabels.onRequest"),
                      custom: t("priceLabels.custom"),
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={service.active ? "secondary" : "outline"}
                  size="sm"
                  disabled={isPending}
                  onClick={() => toggleActive(service)}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {service.active ? t("deactivate") : t("activate")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
