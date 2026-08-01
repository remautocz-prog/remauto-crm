import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DetailingOrderDetailView } from "@/components/detailing/order-detail-view";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import {
  getDetailingEmployees,
  getDetailingOrderById,
  getDetailingServices,
} from "@/lib/queries/detailing";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("detailing");
  try {
    const order = await getDetailingOrderById(id);
    return { title: order ? order.order_number : t("orderDetails") };
  } catch {
    return { title: t("orderDetails") };
  }
}

export default async function DetailingOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("detailing");
  const result = await runDetailingPageSafe(
    () =>
      Promise.all([
        getDetailingOrderById(id),
        getDetailingServices(),
        getDetailingEmployees(),
      ]),
    [null, [], []] as const
  );

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const [order, services, employees] = result.data;

  if (!order) notFound();

  return (
    <div className="space-y-4">
      <DetailingQueryWarnings warnings={result.warnings} />
      <Button asChild variant="outline" size="sm">
        <Link href="/detailing/orders">{t("backToOrders")}</Link>
      </Button>
      <DetailingOrderDetailView order={order} services={services} employees={employees} />
    </div>
  );
}
