import "server-only";

import { requireAuthenticatedAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { parseDateRangeSearchParams } from "@/lib/date-range/filter";
import { getDocumentEmployeeDashboardSummary } from "@/lib/documents/employee-dashboard";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import { getDocumentTasks } from "@/lib/queries/documents";
import type { DocumentEmployeeDashboardData } from "@/lib/types/documents";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getDocumentTeamAssigneeOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .eq("role", "documents")
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name ?? "").trim() || String(row.id),
  }));
}

async function resolveEmployeeName(employeeId: string | null): Promise<string> {
  if (!employeeId) return "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return String(data?.full_name ?? "").trim() || employeeId;
}

export async function getDocumentEmployeeDashboardData(input?: {
  employee?: string | null;
  from?: string | null;
  to?: string | null;
  preset?: string | null;
  period?: string | null;
}): Promise<DocumentEmployeeDashboardData> {
  const access = await requireAuthenticatedAccess();
  const canSupervise = hasPermission(access.role, "users.view");
  const requestedEmployee = input?.employee?.trim() ?? null;
  const dateRange = parseDateRangeSearchParams({
    from: input?.from,
    to: input?.to,
    preset: input?.preset,
    period: input?.period,
  });

  let employeeId: string | null;
  let employeeName: string;

  if (canSupervise) {
    if (!requestedEmployee || requestedEmployee === "all") {
      employeeId = null;
      employeeName = "";
    } else if (!UUID_PATTERN.test(requestedEmployee)) {
      employeeId = null;
      employeeName = "";
    } else {
      employeeId = requestedEmployee;
      employeeName = await resolveEmployeeName(requestedEmployee);
    }
  } else {
    employeeId = access.userId;
    employeeName = access.profile.full_name?.trim() || access.userId;
  }

  const tasks = await getDocumentTasks({
    assigned_to: employeeId ?? "all",
    archived: false,
  });

  const assigneeOptions = canSupervise
    ? await getDocumentTeamAssigneeOptions()
    : [];

  const viewerName =
    access.profile.full_name?.trim() ||
    access.email?.split("@")[0] ||
    access.userId;

  return getDocumentEmployeeDashboardSummary({
    tasks,
    employeeId,
    employeeName,
    viewerName,
    canSelectEmployee: canSupervise,
    assigneeOptions,
    today: getPragueTodayDateString(),
    dateRange,
  });
}
