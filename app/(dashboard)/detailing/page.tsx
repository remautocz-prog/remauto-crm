import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadDetailingDashboardPageData } from "@/lib/detailing/dashboard-page-data";
import { runDetailingPage } from "@/lib/detailing/page-loader";
import { DetailingDashboard } from "@/components/detailing/detailing-dashboard";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("dashboardTitle") };
}

export default async function DetailingDashboardPage() {
  const result = await runDetailingPage(loadDetailingDashboardPageData);

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const { warnings, ...dashboardProps } = result.data;

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={warnings} />
      <DetailingDashboard {...dashboardProps} />
    </div>
  );
}
