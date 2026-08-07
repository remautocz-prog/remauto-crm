import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getAccountantDashboardData } from "@/lib/queries/accountant-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.accountant");
  return { title: t("title") };
}

type AccountantDashboardPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    period?: string;
  }>;
};

async function AccountantDashboardContent({
  searchParams,
}: AccountantDashboardPageProps) {
  const params = await searchParams;
  const data = await getAccountantDashboardData(params);
  return <AccountantDashboard data={data} />;
}

export default function AccountantDashboardPage({
  searchParams,
}: AccountantDashboardPageProps) {
  return (
    <Suspense fallback={<LoadingScreen messageKey="dashboard" />}>
      <AccountantDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
