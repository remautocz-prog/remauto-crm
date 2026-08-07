import { buildDashboardActivityFeed } from "@/lib/dashboard/activity-feed";
import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
import type { Car } from "@/lib/types/cars";
import type { Client, ClientNote } from "@/lib/types/clients";
import type { DashboardActivityItem } from "@/lib/types/dashboard";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

type CarExpenseRow = {
  id: number;
  car_id: number;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
};

export function buildOwnerActivityFeed(input: {
  clients: Client[];
  cars: Car[];
  documentTasks: DocumentTaskWithRelations[];
  notes: ClientNote[];
  detailingOrders: DetailingOrderWithServices[];
  carExpenses: CarExpenseRow[];
  bounds?: DashboardPeriodBounds;
  limit?: number;
}): DashboardActivityItem[] {
  const carNames = new Map(
    input.cars.map((car) => [car.id, `${car.brand} ${car.model}`.trim()])
  );

  const baseItems = buildDashboardActivityFeed({
    clients: input.clients,
    cars: input.cars,
    documentTasks: input.documentTasks,
    notes: input.notes,
    period: "all",
    limit: input.limit ?? 20,
  });

  const extraItems: DashboardActivityItem[] = [];

  for (const order of input.detailingOrders) {
    const entityName =
      order.vehicle_make_model?.trim() ||
      order.order_number ||
      order.registration_number;

    extraItems.push({
      id: `detailing-created-${order.id}`,
      kind: "detailing_created",
      entityName,
      meta: order.order_number,
      occurredAt: order.created_at,
      href: `/detailing/orders/${order.id}`,
    });

    if (order.updated_at && order.updated_at !== order.created_at) {
      extraItems.push({
        id: `detailing-status-${order.id}-${order.status}-${order.updated_at}`,
        kind: "detailing_status_changed",
        entityName,
        meta: order.status,
        occurredAt: order.updated_at,
        href: `/detailing/orders/${order.id}`,
      });
    }
  }

  for (const expense of input.carExpenses) {
    const carName = carNames.get(expense.car_id) ?? `#${expense.car_id}`;
    extraItems.push({
      id: `expense-added-${expense.id}`,
      kind: "expense_added",
      entityName: carName,
      meta: String(expense.amount),
      occurredAt: expense.created_at,
      href: `/cars/${expense.car_id}`,
    });
  }

  const merged = [...baseItems, ...extraItems].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const filtered =
    input.bounds?.start && input.bounds?.end
      ? merged.filter((item) => {
          const date = item.occurredAt.slice(0, 10);
          return date >= input.bounds!.start! && date <= input.bounds!.end!;
        })
      : merged;

  return filtered.slice(0, input.limit ?? 10);
}
