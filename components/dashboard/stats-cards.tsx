import {
  Car,
  CheckCircle2,
  FileText,
  Sparkles,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types/database";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
};

function StatCard({ title, value, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        <div
          className={
            accent
              ? "rounded-lg bg-red-600/15 p-2 text-red-500"
              : "rounded-lg bg-zinc-800 p-2 text-zinc-400"
          }
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardStatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Total cars" value={String(stats.totalCars)} icon={Car} />
      <StatCard
        title="Cars in stock"
        value={String(stats.carsInStock)}
        icon={Warehouse}
      />
      <StatCard
        title="Cars sold"
        value={String(stats.carsSold)}
        icon={CheckCircle2}
      />
      <StatCard
        title="Open document tasks"
        value={String(stats.openDocumentTasks)}
        icon={FileText}
      />
      <StatCard
        title="Active detailing orders"
        value={String(stats.activeDetailingOrders)}
        icon={Sparkles}
      />
      <StatCard
        title="Total monthly profit"
        value={formatCurrency(stats.monthlyProfit)}
        icon={TrendingUp}
        accent
      />
    </div>
  );
}
