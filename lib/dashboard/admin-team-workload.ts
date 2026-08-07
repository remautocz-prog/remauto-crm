import { ACTIVE_DETAILING_ORDER_STATUSES } from "@/lib/constants/detailing";
import { ACTIVE_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import {
  getDetailingWorkloadSignal,
  getDocumentsWorkloadSignal,
  type WorkloadSignal,
} from "@/lib/dashboard/workload-thresholds";
import { isOrderRelevantToEmployee } from "@/lib/detailing/employee-dashboard";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import { isTaskDueToday, isTaskOverdue } from "@/lib/documents/helpers";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type AdminTeamWorkloadRow = {
  id: string;
  name: string;
  module: "documents" | "detailing";
  activeCount: number;
  overdueCount: number;
  dueTodayCount: number;
  readyCount: number;
  criticalCount: number;
  signal: WorkloadSignal;
  href: string;
};

function isActiveDocumentTask(task: DocumentTaskWithRelations) {
  return (
    !task.archived_at &&
    ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

function isActiveDetailingOrder(order: DetailingOrderWithServices) {
  return (
    !order.archived_at &&
    ACTIVE_DETAILING_ORDER_STATUSES.includes(order.status)
  );
}

export function buildDocumentsTeamWorkload(
  tasks: DocumentTaskWithRelations[],
  profiles: { id: string; full_name: string | null }[],
  today = getPragueTodayDateString()
): AdminTeamWorkloadRow[] {
  const rows = new Map<string, AdminTeamWorkloadRow>();

  for (const profile of profiles) {
    rows.set(profile.id, {
      id: profile.id,
      name: profile.full_name?.trim() || profile.id,
      module: "documents",
      activeCount: 0,
      overdueCount: 0,
      dueTodayCount: 0,
      readyCount: 0,
      criticalCount: 0,
      signal: "normal",
      href: `/documents/dashboard?employee=${profile.id}`,
    });
  }

  for (const task of tasks) {
    if (!isActiveDocumentTask(task) || !task.assigned_to) continue;
    const row = rows.get(task.assigned_to);
    if (!row) continue;

    row.activeCount += 1;
    if (isTaskOverdue(task, today)) {
      row.overdueCount += 1;
      row.criticalCount += 1;
    }
    if (isTaskDueToday(task, today)) row.dueTodayCount += 1;
    if (task.priority === "urgent" || task.priority === "high") {
      row.criticalCount += isTaskOverdue(task, today) ? 0 : 1;
    }
  }

  return [...rows.values()]
    .filter((row) => row.activeCount > 0)
    .map((row) => ({
      ...row,
      signal: getDocumentsWorkloadSignal(row.activeCount),
    }))
    .sort((a, b) => b.overdueCount - a.overdueCount || b.activeCount - a.activeCount);
}

export function buildDetailingTeamWorkload(
  orders: DetailingOrderWithServices[],
  profiles: { id: string; full_name: string | null }[],
  today = getPragueTodayDateString()
): AdminTeamWorkloadRow[] {
  const rows = new Map<string, AdminTeamWorkloadRow>();

  for (const profile of profiles) {
    rows.set(profile.id, {
      id: profile.id,
      name: profile.full_name?.trim() || profile.id,
      module: "detailing",
      activeCount: 0,
      overdueCount: 0,
      dueTodayCount: 0,
      readyCount: 0,
      criticalCount: 0,
      signal: "normal",
      href: `/detailing?employee=${profile.id}`,
    });
  }

  for (const order of orders) {
    if (order.archived_at || order.status === "cancelled") continue;

    for (const profile of profiles) {
      if (!isOrderRelevantToEmployee(order, profile.id)) continue;

      const row = rows.get(profile.id);
      if (!row) continue;

      if (isActiveDetailingOrder(order)) {
        row.activeCount += 1;
      }
      if (order.status === "ready") {
        row.readyCount += 1;
      }
      if (order.appointment_date === today) {
        row.dueTodayCount += 1;
      }
      const expected = order.expected_completion_at?.slice(0, 10);
      if (
        isActiveDetailingOrder(order) &&
        expected &&
        expected < today &&
        order.status !== "ready"
      ) {
        row.overdueCount += 1;
        row.criticalCount += 1;
      }
      if (
        order.status === "delivered" &&
        (order.payment_status === "unpaid" ||
          order.payment_status === "partially_paid")
      ) {
        row.criticalCount += 1;
      }
    }
  }

  return [...rows.values()]
    .filter((row) => row.activeCount > 0 || row.readyCount > 0)
    .map((row) => ({
      ...row,
      signal: getDetailingWorkloadSignal(row.activeCount + row.readyCount),
    }))
    .sort((a, b) => b.overdueCount - a.overdueCount || b.activeCount - a.activeCount);
}
