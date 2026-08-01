import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DetailingOrdersList } from "@/components/detailing/orders-list";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import {
  getDetailingEmployees,
  getDetailingOrders,
} from "@/lib/queries/detailing";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  payment_status?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("ordersTitle") };
}

export default async function DetailingOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await runDetailingPageSafe(
    () =>
      Promise.all([
        getDetailingOrders({
          q: params.q,
          status: params.status,
          payment_status: params.payment_status,
          employee_id: params.employee_id,
          date_from: params.date_from,
          date_to: params.date_to,
        }),
        getDetailingEmployees(true),
      ]),
    [[], []] as const
  );

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const [orders, employees] = result.data;
  const warnings = result.warnings;

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={warnings} />
      <DetailingOrdersList
        orders={orders}
        employees={employees}
        initialQuery={params.q ?? ""}
        initialStatus={params.status ?? "all"}
        initialPaymentStatus={params.payment_status ?? "all"}
        initialEmployeeId={params.employee_id ?? "all"}
        initialDateFrom={params.date_from ?? ""}
        initialDateTo={params.date_to ?? ""}
      />
    </div>
  );
}
