import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getAdminDashboardData } from "@/lib/queries/admin-dashboard";
import { getCurrentUser } from "@/lib/queries/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.admin");
  return { title: t("title") };
}

async function AdminDashboardContent() {
  const [data, user] = await Promise.all([
    getAdminDashboardData(),
    getCurrentUser(),
  ]);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    null;

  return <AdminDashboard data={data} userName={displayName} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen messageKey="dashboard" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
