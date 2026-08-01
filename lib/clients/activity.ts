import { COMPLETED_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import type { Car } from "@/lib/types/cars";
import type { Client, ClientActivityItem, ClientNote } from "@/lib/types/clients";
import type { DetailingOrder, DocumentTask, FinanceTransaction } from "@/lib/types/database";
import { getDocumentTaskTitle } from "@/lib/types/database";

const COMPLETED_STATUSES = new Set([
  ...COMPLETED_DOCUMENT_TASK_STATUSES,
  "CANCELLED",
  "done",
  "sold",
  "archived",
  "closed",
]);

export function buildClientActivityTimeline(input: {
  client: Client;
  cars: Car[];
  documentTasks: DocumentTask[];
  detailingOrders: DetailingOrder[];
  financeTransactions: FinanceTransaction[];
  notes?: ClientNote[];
  labels: {
    clientCreated: string;
    clientUpdated: string;
    clientArchived: string;
    clientUnarchived: string;
    carAdded: (brand: string, model: string) => string;
    carSold: (brand: string, model: string) => string;
    documentCreated: (title: string) => string;
    documentCompleted: (title: string) => string;
    documentStatusChanged: (title: string, status: string) => string;
    documentPaymentMarked: (title: string, amount: string) => string;
    detailingCreated: (id: string) => string;
    detailingCompleted: (id: string) => string;
    paymentRegistered: (amount: string) => string;
    noteAdded: string;
    documentFallback: (id: number) => string;
  };
  formatCurrency: (value: number) => string;
  translateStatus?: (status: string) => string;
}): ClientActivityItem[] {
  const items: ClientActivityItem[] = [];

  items.push({
    id: `client-created-${input.client.id}`,
    kind: "client_created",
    title: input.labels.clientCreated,
    subtitle: input.client.full_name,
    occurredAt: input.client.created_at,
    href: null,
  });

  if (input.client.updated_at && input.client.updated_at !== input.client.created_at) {
    items.push({
      id: `client-updated-${input.client.id}`,
      kind: "client_updated",
      title: input.labels.clientUpdated,
      occurredAt: input.client.updated_at,
      href: `/clients/${input.client.id}`,
    });
  }

  if (!input.client.is_active) {
    items.push({
      id: `client-archived-${input.client.id}`,
      kind: "client_archived",
      title: input.labels.clientArchived,
      occurredAt: input.client.updated_at,
      href: `/clients/${input.client.id}`,
    });
  }

  for (const car of input.cars) {
    items.push({
      id: `car-added-${car.id}`,
      kind: "car_added",
      title: input.labels.carAdded(car.brand, car.model),
      subtitle: car.business_model,
      occurredAt: car.created_at,
      href: `/cars/${car.id}`,
    });

    if (car.status === "sold") {
      items.push({
        id: `car-sold-${car.id}`,
        kind: "car_sold",
        title: input.labels.carSold(car.brand, car.model),
        subtitle: car.sale_date ?? undefined,
        occurredAt: car.sale_date ?? car.updated_at,
        href: `/cars/${car.id}`,
      });
    }
  }

  for (const task of input.documentTasks) {
    const title = getDocumentTaskTitle(task, input.labels.documentFallback);
    const href = `/documents/${task.id}`;

    items.push({
      id: `document-created-${task.id}`,
      kind: "document_created",
      title: input.labels.documentCreated(title),
      occurredAt: task.created_at,
      href,
    });

    if (task.updated_at && task.updated_at !== task.created_at) {
      items.push({
        id: `document-status-${task.id}-${task.status}`,
        kind: "document_status_changed",
        title: input.labels.documentStatusChanged(
          title,
          input.translateStatus?.(task.status) ?? task.status
        ),
        occurredAt: task.updated_at,
        href,
      });
    }

    const finance = getDocumentFinanceSummary(task);
    if (finance.paidAmount > 0) {
      items.push({
        id: `document-payment-${task.id}`,
        kind: "document_payment_marked",
        title: input.labels.documentPaymentMarked(title, input.formatCurrency(finance.paidAmount)),
        occurredAt: task.paid_at ?? task.updated_at ?? task.created_at,
        href,
      });
    }

    if (COMPLETED_STATUSES.has(task.status)) {
      items.push({
        id: `document-completed-${task.id}`,
        kind: "document_completed",
        title: input.labels.documentCompleted(title),
        occurredAt: task.completed_at ?? task.updated_at ?? task.created_at,
        href,
      });
    }
  }

  for (const order of input.detailingOrders) {
    items.push({
      id: `detailing-created-${order.id}`,
      kind: "detailing_created",
      title: input.labels.detailingCreated(order.id),
      occurredAt: order.created_at,
      href: `/detailing/orders/${order.id}`,
    });

    if (order.status === "delivered") {
      items.push({
        id: `detailing-completed-${order.id}`,
        kind: "detailing_completed",
        title: input.labels.detailingCompleted(order.id),
        occurredAt: order.actual_completion_at ?? order.updated_at,
        href: `/detailing/orders/${order.id}`,
      });
    }
  }

  for (const tx of input.financeTransactions) {
    if (tx.type !== "income") continue;
    items.push({
      id: `payment-${tx.id}`,
      kind: "payment_registered",
      title: input.labels.paymentRegistered(input.formatCurrency(Number(tx.amount))),
      subtitle: tx.description,
      occurredAt: tx.transaction_date,
      href: "/finance",
    });
  }

  for (const note of input.notes ?? []) {
    items.push({
      id: `note-added-${note.id}`,
      kind: "note_added",
      title: input.labels.noteAdded,
      subtitle: note.author?.full_name ?? undefined,
      occurredAt: note.created_at,
      href: `/clients/${note.client_id}`,
    });
  }

  return items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export function getClientLastActivityAt(input: {
  client: Client;
  cars: Car[];
  documentTasks: DocumentTask[];
  detailingOrders: DetailingOrder[];
  notes?: ClientNote[];
}): string {
  const timestamps = [
    input.client.updated_at,
    input.client.created_at,
    ...input.cars.map((car) => car.updated_at),
    ...input.documentTasks.map((task) => task.updated_at ?? task.created_at),
    ...input.detailingOrders.map((order) => order.updated_at),
    ...(input.notes ?? []).map((note) => note.created_at),
  ].filter(Boolean);

  return timestamps.sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )[0];
}

export function groupCarsByRelationship(cars: Car[], clientId: number) {
  return {
    owned: cars.filter(
      (car) => car.business_model === "owned" && car.client_id === clientId
    ),
    commission: cars.filter(
      (car) =>
        car.business_model === "commission" &&
        (car.owner_client_id === clientId || car.client_id === clientId)
    ),
    clientOrders: cars.filter(
      (car) => car.business_model === "client_order" && car.client_id === clientId
    ),
    asBuyer: cars.filter((car) => car.client_id === clientId),
    asOwner: cars.filter((car) => car.owner_client_id === clientId),
  };
}

export function flattenClientCars(carGroups: ReturnType<typeof groupCarsByRelationship>) {
  const seen = new Set<number>();
  const all: Car[] = [];
  for (const group of Object.values(carGroups)) {
    for (const car of group) {
      if (seen.has(car.id)) continue;
      seen.add(car.id);
      all.push(car);
    }
  }
  return all;
}
