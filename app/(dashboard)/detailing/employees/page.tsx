import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DetailingEmployeesManager } from "@/components/detailing/employees-manager";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import {
  getDetailingEmployeeMonthStats,
  getDetailingEmployees,
  getProfileOptionsForDetailingEmployees,
} from "@/lib/queries/detailing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("employeesTitle") };
}

export default async function DetailingEmployeesPage() {
  const result = await runDetailingPageSafe(
    () =>
      Promise.all([
        getDetailingEmployees(true),
        getProfileOptionsForDetailingEmployees(),
        getDetailingEmployeeMonthStats(),
      ]),
    [[], [], new Map()] as const
  );

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const [employees, profiles, monthStatsMap] = result.data;
  const monthStats = Object.fromEntries(monthStatsMap.entries());

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={result.warnings} />
      <DetailingEmployeesManager
        employees={employees}
        profiles={profiles}
        monthStats={monthStats}
      />
    </div>
  );
}
