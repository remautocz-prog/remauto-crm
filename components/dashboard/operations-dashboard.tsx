"use client";

import type { Profile } from "@/lib/types/cars";
import type { OperationsDashboardData } from "@/lib/types/dashboard";
import { DashboardAttentionMetrics } from "@/components/dashboard/dashboard-attention-metrics";
import { DashboardBusinessOverviewSection } from "@/components/dashboard/dashboard-business-overview";
import { DashboardDealsSection } from "@/components/dashboard/dashboard-deals-section";
import { DashboardEmployeeWorkloadSection } from "@/components/dashboard/dashboard-employee-workload";
import { DashboardFinancialOverviewSection } from "@/components/dashboard/dashboard-financial-overview";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardPeriodSelector } from "@/components/dashboard/dashboard-period-selector";
import { DashboardRecentActivitySection } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardRecentVehiclesSection } from "@/components/dashboard/dashboard-recent-vehicles";
import { DashboardTodaysWork } from "@/components/dashboard/dashboard-todays-work";

type OperationsDashboardProps = {
  data: OperationsDashboardData;
  profiles: Profile[];
  userName?: string | null;
};

export function OperationsDashboard({
  data,
  profiles,
  userName,
}: OperationsDashboardProps) {
  return (
    <div className="space-y-8">
      <DashboardHeader userName={userName} />

      <DashboardPeriodSelector period={data.period} />

      <DashboardAttentionMetrics
        metrics={data.attention}
        error={data.errors.documents}
      />

      <DashboardDealsSection metrics={data.deals} error={data.errors.deals} />

      <DashboardTodaysWork
        tasks={data.todaysWork}
        profiles={profiles}
        error={data.errors.documents}
      />

      <div className="border-t border-zinc-800/80" aria-hidden />

      <DashboardFinancialOverviewSection
        financial={data.financial}
        error={data.errors.documents ?? data.errors.cars}
      />

      <DashboardBusinessOverviewSection
        business={data.business}
        activeInventoryValue={data.financial.cars.activeInventoryValue}
        errors={{
          cars: data.errors.cars,
          clients: data.errors.clients,
          documents: data.errors.documents,
        }}
      />

      <DashboardRecentVehiclesSection
        cars={data.recentCars}
        clients={data.clientOptions}
        error={data.errors.cars}
      />

      <DashboardEmployeeWorkloadSection
        rows={data.employeeWorkload}
        error={data.errors.documents}
      />

      <DashboardRecentActivitySection
        items={data.recentActivity}
        error={data.errors.activity}
      />
    </div>
  );
}
