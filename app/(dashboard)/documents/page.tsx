import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DocumentsList } from "@/components/documents/documents-list";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getCurrentUserAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { parseDocumentListSegment } from "@/lib/documents/list-segment";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";
import {
  getDocumentFilterOptions,
  getDocumentTasksForList,
} from "@/lib/queries/documents";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("documents") };
}

type DocumentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    service_type?: string;
    assigned_to?: string;
    payment_status?: string;
    deadline?: string;
    assignment?: string;
    payment?: string;
    overdue?: string;
    due_today?: string;
    due_this_week?: string;
    no_deadline?: string;
    unassigned_only?: string;
    archived?: string;
    segment?: string;
    sort?: string;
    view?: string;
    client_id?: string;
    car_id?: string;
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

async function DocumentsPageContent({
  searchParams,
}: {
  searchParams: DocumentsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const segment = parseDocumentListSegment({
    segment: params.segment,
    archived: params.archived === "1",
  });
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const priority = params.priority ?? "all";
  const serviceType = params.service_type ?? "all";
  const assignedTo = params.assigned_to ?? "all";
  const paymentStatus = params.payment_status ?? "all";
  const overdue =
    params.overdue === "1" || params.deadline === "overdue";
  const dueToday =
    params.due_today === "1" || params.deadline === "today";
  const dueThisWeek = params.due_this_week === "1";
  const noDeadline = params.no_deadline === "1";
  const unassignedOnly =
    params.unassigned_only === "1" || params.assignment === "unassigned";
  const outstandingOnly = params.payment === "unpaid";
  const sort = params.sort ?? "newest";
  const view =
    segment === "active" && params.view === "kanban" ? "kanban" : "table";
  const initialClientId = params.client_id ? Number(params.client_id) : null;
  const initialCarId = params.car_id ? Number(params.car_id) : null;

  const access = await getCurrentUserAccess();
  const role = access?.role ?? "inactive";
  const showArchiveMetadata = hasPermission(role, "users.view");
  const canRestoreArchived = hasPermission(role, "documents.archive");
  const canArchive = hasPermission(role, "documents.archive");

  const [tasks, clients, cars, profiles, filterOptions] = await Promise.all([
    getDocumentTasksForList({
      q,
      status,
      priority,
      service_type: serviceType,
      assigned_to: assignedTo,
      payment_status: paymentStatus,
      overdue,
      due_today: dueToday,
      due_this_week: dueThisWeek,
      no_deadline: noDeadline,
      unassigned_only: unassignedOnly,
      outstanding_only: outstandingOnly,
      segment,
      sort,
    }),
    getClientOptions(),
    getCarOptions(),
    getProfileOptions(),
    getDocumentFilterOptions(),
  ]);

  return (
    <DocumentsList
      tasks={tasks}
      clients={clients}
      cars={cars}
      profiles={profiles}
      assignees={filterOptions.assignees}
      initialQuery={q}
      initialStatus={status}
      initialPriority={priority}
      initialServiceType={serviceType}
      initialAssignedTo={assignedTo}
      initialPaymentStatus={paymentStatus}
      initialOverdue={overdue}
      initialDueToday={dueToday}
      initialDueThisWeek={dueThisWeek}
      initialNoDeadline={noDeadline}
      initialUnassignedOnly={unassignedOnly}
      initialSegment={segment}
      initialSort={sort}
      initialView={view}
      showArchiveMetadata={showArchiveMetadata}
      canRestoreArchived={canRestoreArchived}
      canArchive={canArchive}
      initialClientId={
        initialClientId != null && !Number.isNaN(initialClientId) ? initialClientId : null
      }
      initialCarId={
        initialCarId != null && !Number.isNaN(initialCarId) ? initialCarId : null
      }
    />
  );
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const t = await getTranslations("documents");

  return (
    <Suspense fallback={<LoadingScreen message={t("loading")} />}>
      <DocumentsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
