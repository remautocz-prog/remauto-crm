import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DocumentsEmployeeDashboard } from "@/components/documents/documents-employee-dashboard";
import { LoadingScreen } from "@/components/shared/loading-screen";
import type { DocumentEmployeeDashboardFocus } from "@/lib/documents/employee-dashboard";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";
import { getDocumentEmployeeDashboardData } from "@/lib/queries/document-employee-dashboard";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("documents.employeeDashboard");
  return { title: t("pageTitle") };
}

type DocumentsDashboardPageProps = {
  searchParams: Promise<{
    employee?: string;
    focus?: string;
    from?: string;
    to?: string;
    preset?: string;
    period?: string;
  }>;
};

async function getCarOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("id, brand, model, year, vin, registration_number, client_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: number;
    brand: string;
    model: string;
    year: number;
    vin: string | null;
    registration_number: string | null;
    client_id: number | null;
  }>;
}

function parseFocus(value?: string): DocumentEmployeeDashboardFocus {
  if (
    value === "active" ||
    value === "due_in_period" ||
    value === "overdue" ||
    value === "completed"
  ) {
    return value;
  }
  return "all";
}

async function DocumentsDashboardContent({
  searchParams,
}: {
  searchParams: DocumentsDashboardPageProps["searchParams"];
}) {
  const params = await searchParams;
  const selectedEmployee = params.employee?.trim() || "all";

  const [data, clients, cars, profiles] = await Promise.all([
    getDocumentEmployeeDashboardData({
      employee: selectedEmployee,
      from: params.from,
      to: params.to,
      preset: params.preset,
      period: params.period,
    }),
    getClientOptions(),
    getCarOptions(),
    getProfileOptions(),
  ]);

  return (
    <DocumentsEmployeeDashboard
      data={data}
      selectedEmployee={selectedEmployee}
      clients={clients}
      cars={cars}
      profiles={profiles}
      initialFocus={parseFocus(params.focus)}
    />
  );
}

export default function DocumentsDashboardPage({
  searchParams,
}: DocumentsDashboardPageProps) {
  return (
    <Suspense fallback={<LoadingScreen messageKey="dashboard" />}>
      <DocumentsDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
