import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DetailingServicesAdmin } from "@/components/detailing/services-admin";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import { getDetailingServices } from "@/lib/queries/detailing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("servicesTitle") };
}

export default async function DetailingServicesPage() {
  const result = await runDetailingPageSafe(() => getDetailingServices(true), []);

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={result.warnings} />
      <DetailingServicesAdmin services={result.data} />
    </div>
  );
}
