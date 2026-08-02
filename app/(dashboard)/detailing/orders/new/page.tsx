import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DetailingNewOrderForm } from "@/components/detailing/new-order-form";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { loadNewDetailingOrderPageData } from "@/lib/detailing/new-order-page-data";
import { runDetailingPage } from "@/lib/detailing/page-loader";
import { loadDetailingOrderPrefill } from "@/lib/cars/detailing-prefill";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ car_id?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("newOrder") };
}

export default async function NewDetailingOrderPage({
  searchParams,
}: PageProps) {
  const t = await getTranslations("detailing");
  const { car_id: carIdParam } = await searchParams;
  const carId = carIdParam ? Number(carIdParam) : NaN;
  const prefill =
    Number.isFinite(carId) && carId > 0
      ? await loadDetailingOrderPrefill(carId)
      : null;

  const result = await runDetailingPage(loadNewDetailingOrderPageData);

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const { services, employees, warnings } = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DetailingQueryWarnings warnings={warnings} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-zinc-400 hover:text-white"
          >
            <Link href="/detailing/orders">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t("backToOrders")}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t("newOrder")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">{t("newOrderDescription")}</p>
        </div>
      </div>

      <DetailingNewOrderForm
        services={services}
        employees={employees}
        warnings={warnings}
        prefill={prefill}
      />
    </div>
  );
}
