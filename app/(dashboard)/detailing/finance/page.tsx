import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DetailingFinanceReportView } from "@/components/detailing/finance-report";
import { DetailingDatabaseNotReady } from "@/components/detailing/database-not-ready";
import { DetailingQueryWarnings } from "@/components/detailing/detailing-query-warnings";
import { EMPTY_DETAILING_FINANCE_REPORT } from "@/lib/detailing/defaults";
import { runDetailingPageSafe } from "@/lib/detailing/page-loader";
import {
  getDetailingEmployees,
  getDetailingFinanceReport,
} from "@/lib/queries/detailing";

type SearchParams = Promise<{
  period?: string;
  date_from?: string;
  date_to?: string;
  employee_id?: string;
}>;

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("detailing");
  return { title: t("financeTitle") };
}

export default async function DetailingFinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const period = params.period ?? "current_month";
  const current = monthRange(0);
  const previous = monthRange(-1);
  const dateFrom =
    params.date_from ??
    (period === "previous_month" ? previous.from : current.from);
  const dateTo =
    params.date_to ??
    (period === "previous_month" ? previous.to : current.to);

  const result = await runDetailingPageSafe(
    () =>
      Promise.all([
        getDetailingFinanceReport({
          date_from: dateFrom,
          date_to: dateTo,
          employee_id: params.employee_id,
        }),
        getDetailingEmployees(true),
      ]),
    [EMPTY_DETAILING_FINANCE_REPORT, []] as const
  );

  if (result.blocked) {
    return <DetailingDatabaseNotReady readiness={result.readiness} />;
  }

  const [report, employees] = result.data;

  return (
    <div className="space-y-6">
      <DetailingQueryWarnings warnings={result.warnings} />
      <DetailingFinanceReportView
        report={report}
        employees={employees}
        initialPeriod={period}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        initialEmployeeId={params.employee_id ?? "all"}
      />
    </div>
  );
}
