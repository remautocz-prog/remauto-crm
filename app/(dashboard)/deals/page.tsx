import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DealsList } from "@/components/deals/deals-list";
import { PageHeader } from "@/components/shared/page-shell";
import { getCurrentUserAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { parseDealListSegment } from "@/lib/deals/list-segment";
import { getProfileOptions } from "@/lib/queries/cars";
import { getDeals } from "@/lib/queries/deals";

type DealsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("deals");
  return { title: t("deals") };
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const paymentStatus = typeof params.payment_status === "string" ? params.payment_status : "";
  const payer = typeof params.payer === "string" ? params.payer : "";
  const assignedTo = typeof params.assigned_to === "string" ? params.assigned_to : "";
  const segment = parseDealListSegment({
    segment: typeof params.segment === "string" ? params.segment : null,
    archived: params.archived === "1",
  });
  const filter = typeof params.filter === "string" ? params.filter : "";

  const access = await getCurrentUserAccess();
  const role = access?.role ?? "inactive";
  const canArchive = hasPermission(role, "deals.archive");
  const canRestoreArchived = canArchive;

  const [deals, profiles, t] = await Promise.all([
    getDeals({ q, status, payment_status: paymentStatus, payer, assigned_to: assignedTo, segment, filter }),
    getProfileOptions(),
    getTranslations("deals"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("deals")} description={t("pageDescription")} />
      <DealsList
        deals={deals}
        profiles={profiles}
        initialQuery={q}
        initialStatus={status}
        initialPaymentStatus={paymentStatus}
        initialPayer={payer}
        initialAssignedTo={assignedTo}
        initialSegment={segment}
        initialFilter={filter}
        canArchive={canArchive}
        canRestoreArchived={canRestoreArchived}
      />
    </div>
  );
}
