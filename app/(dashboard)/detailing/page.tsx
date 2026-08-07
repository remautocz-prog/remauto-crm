import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentUserAccess } from "@/lib/auth/access";
import { loadDetailingDashboardPageData } from "@/lib/detailing/dashboard-page-data";
import { runDetailingPage, runDetailingPageSafe } from "@/lib/detailing/page-loader";
import { getDetailingEmployeeDashboardData } from "@/lib/queries/detailing-employee-dashboard";
import { DetailingDashboard } from "@/components/detailing/detailing-dashboard";
import { DetailingEmployeeDashboard } from "@/components/detailing/detailing-employee-dashboard";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { LoadingScreen } from "@/components/shared/loading-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("dashboardTitle") };
}

type DetailingDashboardPageProps = {
  searchParams: Promise<{
    employee?: string;
    from?: string;
    to?: string;
    preset?: string;
    period?: string;
  }>;
};

function shouldUseEmployeeDashboard(
  role: string,
  showCompanyDashboard: boolean,
  employeeParam?: string
) {
  if (role === "detailing") return true;
  return showCompanyDashboard && Boolean(employeeParam?.trim());
}

async function DetailingDashboardPageContent({
  searchParams,
}: DetailingDashboardPageProps) {
  const params = await searchParams;
  const access = await getCurrentUserAccess();
  const role = access?.role ?? "inactive";
  const showCompanyFinancials =
    access?.permissions.has("detailing.finance.view") ?? false;
  const canManagePayments =
    (access?.permissions.has("finance.manage") ?? false) ||
    (access?.permissions.has("detailing.payment.update") ?? false);
  const useEmployeeDashboard = shouldUseEmployeeDashboard(
    role,
    showCompanyFinancials,
    params.employee
  );

  if (useEmployeeDashboard) {
    const result = await runDetailingPageSafe(
      () =>
        getDetailingEmployeeDashboardData({
          employee: params.employee,
          from: params.from,
          to: params.to,
          preset: params.preset,
          period: params.period,
        }),
      null
    );

    if (result.blocked) {
      return <DetailingDatabaseNotReady readiness={result.readiness} />;
    }

    const data = result.data;
    if (!data) {
      return <DetailingDatabaseNotReady readiness={result.readiness} />;
    }

    return (
      <div className="space-y-6">
        <DetailingQueryWarnings warnings={result.warnings} />
        <DetailingEmployeeDashboard
          data={data}
          selectedEmployee={params.employee ?? data.employeeId}
          canUpdatePayment={canManagePayments}
        />
      </div>
    );
  }

  const result = await runDetailingPage(loadDetailingDashboardPageData);

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const { warnings, ...dashboardProps } = result.data;

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={warnings} />
      <DetailingDashboard
        {...dashboardProps}
        showCompanyFinancials={showCompanyFinancials}
        canManagePayments={access?.permissions.has("finance.manage") ?? false}
      />
    </div>
  );
}

export default async function DetailingDashboardPage({
  searchParams,
}: DetailingDashboardPageProps) {
  const t = await getTranslations("detailing");

  return (
    <Suspense fallback={<LoadingScreen message={t("dashboardTitle")} />}>
      <DetailingDashboardPageContent searchParams={searchParams} />
    </Suspense>
  );
}
