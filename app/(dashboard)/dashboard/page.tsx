import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { OperationsDashboard } from "@/components/dashboard/operations-dashboard";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import { getCurrentUser } from "@/lib/queries/dashboard";
import { getProfileOptions } from "@/lib/queries/cars";
import { getOperationsDashboardData } from "@/lib/queries/operations-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

type DashboardPageProps = {
  searchParams: Promise<{ period?: string }>;
};

async function DashboardContent({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period = parseDashboardPeriod(params.period);

  const [data, profiles, user] = await Promise.all([
    getOperationsDashboardData(period),
    getProfileOptions(),
    getCurrentUser(),
  ]);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <OperationsDashboard
      data={data}
      profiles={profiles}
      userName={displayName}
    />
  );
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<LoadingScreen messageKey="dashboard" />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
