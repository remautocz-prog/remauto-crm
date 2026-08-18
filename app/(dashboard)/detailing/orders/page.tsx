import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DetailingOrdersList } from "@/components/detailing/orders-list";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { getCurrentUserAccess } from "@/lib/auth/access";
import { canPermanentlyDelete, hasPermission } from "@/lib/auth/permissions";
import { parseDetailingListSegment } from "@/lib/detailing/list-segment";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import {
  getDetailingEmployees,
  getDetailingOrders,
} from "@/lib/queries/detailing";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  payment?: string;
  payment_status?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  segment?: string;
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
  const segment = parseDetailingListSegment(params.segment);
  const outstandingOnly =
    params.payment === "unpaid" || params.payment_status === "outstanding";
  const access = await getCurrentUserAccess();
  const role = access?.role ?? "inactive";
  const canArchive = hasPermission(role, "detailing.update");
  const canRestoreArchived =
    canArchive && (role === "owner" || role === "admin");
  const showPermanentDelete = canPermanentlyDelete(role);

  const result = await runDetailingPageSafe(
    () =>
      Promise.all([
        getDetailingOrders({
          q: params.q,
          status: params.status,
          payment_status: outstandingOnly ? undefined : params.payment_status,
          employee_id: params.employee_id,
          date_from: params.date_from,
          date_to: params.date_to,
          segment,
          outstanding_only: outstandingOnly,
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
        initialSegment={segment}
        canArchive={canArchive}
        canRestoreArchived={canRestoreArchived}
        canPermanentlyDelete={showPermanentDelete}
      />
    </div>
  );
}
