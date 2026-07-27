import { COMPLETED_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrder, DocumentTask, FinanceTransaction } from "@/lib/types/database";
import type { Client, ClientActivityItem } from "@/lib/types/clients";
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
  labels: {
    clientCreated: string;
    carAdded: (brand: string, model: string) => string;
    carSold: (brand: string, model: string) => string;
    documentCreated: (title: string) => string;
    documentCompleted: (title: string) => string;
    detailingCreated: (id: number) => string;
    detailingCompleted: (id: number) => string;
    paymentRegistered: (amount: string) => string;
    documentFallback: (id: number) => string;
  };
  formatCurrency: (value: number) => string;
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

  for (const car of input.cars) {
    items.push({
      id: `car-added-${car.id}`,
      kind: "car_added",
      title: input.labels.carAdded(car.brand, car.model),
      subtitle: car.business_model,
      occurredAt: car.created_at,
      href: `/cars/${car.id}`,
    });

    if (car.status === "sold" && car.sale_date) {
      items.push({
        id: `car-sold-${car.id}`,
        kind: "car_sold",
        title: input.labels.carSold(car.brand, car.model),
        subtitle: car.sale_date,
        occurredAt: car.sale_date,
        href: `/cars/${car.id}`,
      });
    } else if (car.status === "sold") {
      items.push({
        id: `car-sold-${car.id}`,
        kind: "car_sold",
        title: input.labels.carSold(car.brand, car.model),
        occurredAt: car.updated_at,
        href: `/cars/${car.id}`,
      });
    }
  }

  for (const task of input.documentTasks) {
    const title = getDocumentTaskTitle(task, input.labels.documentFallback);
    items.push({
      id: `document-created-${task.id}`,
      kind: "document_created",
      title: input.labels.documentCreated(title),
      occurredAt: task.created_at,
      href: "/documents",
    });

    if (COMPLETED_STATUSES.has(task.status)) {
      items.push({
        id: `document-completed-${task.id}`,
        kind: "document_completed",
        title: input.labels.documentCompleted(title),
        occurredAt: task.updated_at ?? task.created_at,
        href: "/documents",
      });
    }
  }

  for (const order of input.detailingOrders) {
    items.push({
      id: `detailing-created-${order.id}`,
      kind: "detailing_created",
      title: input.labels.detailingCreated(order.id),
      occurredAt: order.created_at,
      href: "/detailing",
    });

    if (COMPLETED_STATUSES.has(order.status)) {
      items.push({
        id: `detailing-completed-${order.id}`,
        kind: "detailing_completed",
        title: input.labels.detailingCompleted(order.id),
        occurredAt: order.updated_at,
        href: "/detailing",
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

  return items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export function getClientLastActivityAt(input: {
  client: Client;
  cars: Car[];
  documentTasks: DocumentTask[];
  detailingOrders: DetailingOrder[];
}): string {
  const timestamps = [
    input.client.updated_at,
    input.client.created_at,
    ...input.cars.map((car) => car.updated_at),
    ...input.documentTasks.map((task) => task.updated_at ?? task.created_at),
    ...input.detailingOrders.map((order) => order.updated_at),
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
