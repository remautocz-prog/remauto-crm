import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardStatsCards } from "@/components/dashboard/stats-cards";
import { DashboardStatsSkeleton } from "@/components/dashboard/stats-skeleton";
import { getDashboardStats, getCurrentUser } from "@/lib/queries/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function DashboardContent() {
  const [stats, user] = await Promise.all([
    getDashboardStats(),
    getCurrentUser(),
  ]);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Welcome back, {displayName}
        </h2>
        <p className="text-zinc-400">
          Here&apos;s an overview of your business today.
        </p>
      </div>

      <DashboardStatsCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-zinc-400">
            <p>Add a new car to inventory</p>
            <p>Create a client record</p>
            <p>Schedule a detailing order</p>
            <p>Log a finance transaction</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">
              System status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Supabase connection</span>
              <span className="font-medium text-green-500">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Authentication</span>
              <span className="font-medium text-green-500">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Data source</span>
              <span className="font-medium text-white">Live database</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardStatsSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
