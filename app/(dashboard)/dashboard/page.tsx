import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DashboardStatsCards } from "@/components/dashboard/stats-cards";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getDashboardStats, getCurrentUser } from "@/lib/queries/dashboard";
import { getCarBusinessStats } from "@/lib/queries/car-business-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

async function DashboardContent() {
  const [stats, businessStats, user, t] = await Promise.all([
    getDashboardStats(),
    getCarBusinessStats(),
    getCurrentUser(),
    getTranslations("dashboard"),
  ]);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    t("colleague");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {t("welcome")}, {displayName}
        </h2>
        <p className="text-zinc-400">{t("overview")}</p>
      </div>

      <DashboardStatsCards stats={stats} businessStats={businessStats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">
              {t("quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-zinc-400">
            <p>{t("addCarHint")}</p>
            <p>{t("createClientHint")}</p>
            <p>{t("scheduleDetailingHint")}</p>
            <p>{t("logFinanceHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">
              {t("systemStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{t("supabaseConnection")}</span>
              <span className="font-medium text-green-500">{t("connected")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{t("authentication")}</span>
              <span className="font-medium text-green-500">{t("active")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{t("dataSource")}</span>
              <span className="font-medium text-white">{t("liveDatabase")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen messageKey="dashboard" />}>
      <DashboardContent />
    </Suspense>
  );
}
