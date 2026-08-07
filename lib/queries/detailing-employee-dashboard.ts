import "server-only";

import { requireAuthenticatedAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { parseDateRangeSearchParams } from "@/lib/date-range/filter";
import { getDetailingEmployeeDashboardSummary } from "@/lib/detailing/employee-dashboard";
import { DETAILING_ORDER_SELECT, hydrateDetailingOrdersWithServices } from "@/lib/detailing/order-services-loader";
import { handleDetailingQueryError } from "@/lib/detailing/query-utils";
import { mapDetailingOrder } from "@/lib/queries/detailing";
import type { DetailingEmployeeDashboardData, DetailingOrderWithServices } from "@/lib/types/detailing";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getDetailingTeamAssigneeOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .eq("role", "detailing")
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name ?? "").trim() || String(row.id),
  }));
}

async function resolveEmployeeName(employeeId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return String(data?.full_name ?? "").trim() || employeeId;
}

async function getDetailingOrdersForEmployeeDashboard(): Promise<
  DetailingOrderWithServices[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .is("archived_at", null)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (error) handleDetailingQueryError("getDetailingOrdersForEmployeeDashboard", error);

  const orders = (data ?? []).map((row) => mapDetailingOrder(row as Record<string, unknown>));
  return hydrateDetailingOrdersWithServices(orders);
}

export async function getDetailingEmployeeDashboardData(input?: {
  employee?: string | null;
  from?: string | null;
  to?: string | null;
  preset?: string | null;
  period?: string | null;
}): Promise<DetailingEmployeeDashboardData> {
  const access = await requireAuthenticatedAccess();
  const canSupervise = hasPermission(access.role, "users.view");
  const requestedEmployee = input?.employee?.trim() ?? null;
  const dateRange = parseDateRangeSearchParams({
    from: input?.from,
    to: input?.to,
    preset: input?.preset,
    period: input?.period,
  });

  let employeeId: string;
  let employeeName: string;

  if (!canSupervise) {
    employeeId = access.userId;
    employeeName = access.profile.full_name?.trim() || access.userId;
  } else if (requestedEmployee && UUID_PATTERN.test(requestedEmployee)) {
    employeeId = requestedEmployee;
    employeeName = await resolveEmployeeName(requestedEmployee);
  } else {
    employeeId = access.userId;
    employeeName = access.profile.full_name?.trim() || access.userId;
  }

  const [orders, assigneeOptions] = await Promise.all([
    getDetailingOrdersForEmployeeDashboard(),
    canSupervise ? getDetailingTeamAssigneeOptions() : Promise.resolve([]),
  ]);

  return getDetailingEmployeeDashboardSummary({
    orders,
    employeeId,
    employeeName,
    viewerName: access.profile.full_name?.trim() || access.userId,
    canSelectEmployee: canSupervise,
    assigneeOptions,
    dateRange,
    today: todayIso(),
  });
}
