import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getCurrentUser } from "@/lib/queries/dashboard";
import { getOwnerDashboardData } from "@/lib/queries/owner-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.owner");
  return { title: t("title") };
}

type DashboardPageProps = {
  searchParams: Promise<{ period?: string }>;
};

async function DashboardContent({ searchParams }: DashboardPageProps) {
  const [data, user] = await Promise.all([
    getOwnerDashboardData("month"),
    getCurrentUser(),
  ]);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    null;

  return <OwnerDashboard data={data} userName={displayName} />;
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<LoadingScreen messageKey="dashboard" />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
