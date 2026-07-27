import { COMPLETED_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import { getDocumentTaskTitle } from "@/lib/types/database";
import type { Car } from "@/lib/types/cars";
import type { Client, ClientNote } from "@/lib/types/clients";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { DashboardActivityItem } from "@/lib/types/dashboard";
import {
  getDashboardPeriodBounds,
  isDateWithinPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";

const NOTE_PREVIEW_LENGTH = 48;

function truncatePreview(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= NOTE_PREVIEW_LENGTH) return trimmed;
  return `${trimmed.slice(0, NOTE_PREVIEW_LENGTH).trimEnd()}…`;
}

export function buildDashboardActivityFeed(input: {
  clients: Client[];
  cars: Car[];
  documentTasks: DocumentTaskWithRelations[];
  notes: ClientNote[];
  period: DashboardPeriod;
  limit?: number;
}): DashboardActivityItem[] {
  const bounds = getDashboardPeriodBounds(input.period);
  const items: DashboardActivityItem[] = [];
  const clientNames = new Map(input.clients.map((client) => [client.id, client.full_name]));

  for (const client of input.clients) {
    if (isDateWithinPeriod(client.created_at, bounds)) {
      items.push({
        id: `client-created-${client.id}`,
        kind: "client_created",
        entityName: client.full_name,
        occurredAt: client.created_at,
        href: `/clients/${client.id}`,
      });
    }

    if (
      client.updated_at &&
      client.updated_at !== client.created_at &&
      isDateWithinPeriod(client.updated_at, bounds)
    ) {
      items.push({
        id: `client-updated-${client.id}-${client.updated_at}`,
        kind: "client_updated",
        entityName: client.full_name,
        occurredAt: client.updated_at,
        href: `/clients/${client.id}`,
      });
    }
  }

  for (const car of input.cars) {
    const entityName = `${car.brand} ${car.model}`.trim();

    if (isDateWithinPeriod(car.created_at, bounds)) {
      items.push({
        id: `car-created-${car.id}`,
        kind: "vehicle_created",
        entityName,
        meta: car.registration_number ?? car.vin ?? null,
        occurredAt: car.created_at,
        href: `/cars/${car.id}`,
      });
    }

    if (
      car.status === "sold" &&
      isDateWithinPeriod(car.sale_date ?? car.updated_at, bounds)
    ) {
      items.push({
        id: `car-sold-${car.id}`,
        kind: "vehicle_sold",
        entityName,
        meta: car.sale_date ?? null,
        occurredAt: car.sale_date ?? car.updated_at,
        href: `/cars/${car.id}`,
      });
    }
  }

  for (const task of input.documentTasks) {
    const entityName = getDocumentTaskTitle(task, (id) => `#${id}`);
    const href = `/documents/${task.id}`;
    const employeeName = task.assignee?.full_name ?? undefined;

    if (isDateWithinPeriod(task.created_at, bounds)) {
      items.push({
        id: `document-created-${task.id}`,
        kind: "order_created",
        entityName,
        employeeName,
        occurredAt: task.created_at,
        href,
      });
    }

    if (
      task.updated_at &&
      task.updated_at !== task.created_at &&
      isDateWithinPeriod(task.updated_at, bounds)
    ) {
      items.push({
        id: `document-status-${task.id}-${task.status}-${task.updated_at}`,
        kind: "status_changed",
        entityName,
        meta: task.status,
        employeeName,
        occurredAt: task.updated_at,
        href,
      });

      if (task.assigned_to) {
        items.push({
          id: `document-assigned-${task.id}-${task.updated_at}`,
          kind: "employee_assigned",
          entityName,
          meta: employeeName ?? task.assigned_to,
          employeeName,
          occurredAt: task.updated_at,
          href,
        });
      }

      if (task.priority && task.priority !== "normal") {
        items.push({
          id: `document-priority-${task.id}-${task.priority}-${task.updated_at}`,
          kind: "priority_changed",
          entityName,
          meta: task.priority,
          employeeName,
          occurredAt: task.updated_at,
          href,
        });
      }
    }

    const finance = getDocumentFinanceSummary(task);
    if (finance.paidAmount > 0) {
      const paidAt = task.paid_at ?? task.updated_at ?? task.created_at;
      if (isDateWithinPeriod(paidAt, bounds)) {
        items.push({
          id: `document-payment-${task.id}-${paidAt}`,
          kind: "payment_marked",
          entityName,
          meta: String(finance.paidAmount),
          employeeName,
          occurredAt: paidAt,
          href,
        });
      }
    }

    if (
      COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never) &&
      task.completed_at &&
      isDateWithinPeriod(task.completed_at, bounds) &&
      task.completed_at !== task.updated_at
    ) {
      items.push({
        id: `document-completed-${task.id}-${task.completed_at}`,
        kind: "status_changed",
        entityName,
        meta: task.status,
        employeeName,
        occurredAt: task.completed_at,
        href,
      });
    }
  }

  for (const note of input.notes) {
    if (!isDateWithinPeriod(note.created_at, bounds)) continue;
    const clientName = clientNames.get(note.client_id) ?? `#${note.client_id}`;
    items.push({
      id: `note-added-${note.id}`,
      kind: "note_added",
      entityName: clientName,
      preview: truncatePreview(note.content),
      employeeName: note.author?.full_name ?? undefined,
      occurredAt: note.created_at,
      href: `/clients/${note.client_id}`,
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, input.limit ?? 15);
}
