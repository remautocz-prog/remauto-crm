import {
  calculateCarProfit,
  isCarSold,
} from "@/lib/cars/business-rules";
import { CAR_STATUS_IN_STOCK } from "@/lib/constants/status";
import {
  getDashboardPeriodBounds,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import {
  isTaskActiveForDeadline,
  isTaskDueToday,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import { computeDocumentWorkloadSummary } from "@/lib/documents/summary";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import type { Car } from "@/lib/types/cars";
import type {
  OwnerAttentionItem,
  OwnerTopCards,
} from "@/lib/types/owner-dashboard";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

const CAR_ACTIVE_STATUSES = [
  CAR_STATUS_IN_STOCK,
  "reserved",
  "in_transit",
] as const;

function isCarActive(car: Car) {
  return CAR_ACTIVE_STATUSES.includes(
    car.status as (typeof CAR_ACTIVE_STATUSES)[number]
  );
}

export function computeOwnerTopCards(input: {
  monthlyProfit: number;
  cars: Car[];
  tasks: DocumentTaskWithRelations[];
  detailingOrdersToday: number;
  attentionCount: number;
}): OwnerTopCards {
  let carsInStock = 0;
  let commissionCarsInStock = 0;

  for (const car of input.cars) {
    const sold = isCarSold(car);
    const active = isCarActive(car);

    if (car.business_model === "owned" && car.status === CAR_STATUS_IN_STOCK) {
      carsInStock += 1;
    }

    if (car.business_model === "commission" && active && !sold) {
      commissionCarsInStock += 1;
    }
  }

  const documentSummary = computeDocumentWorkloadSummary({
    tasks: input.tasks,
    today: getPragueTodayDateString(),
  });

  const documentsInProgress = documentSummary.inProgress;

  return {
    monthlyProfit: input.monthlyProfit,
    carsInStock,
    commissionCarsInStock,
    documentsInProgress,
    detailingOrdersToday: input.detailingOrdersToday,
    attentionCount: input.attentionCount,
  };
}

export function computeOwnerAttentionItems(input: {
  cars: Car[];
  tasks: DocumentTaskWithRelations[];
  detailingOrders: DetailingOrderWithServices[];
  today: string;
}): OwnerAttentionItem[] {
  const items: OwnerAttentionItem[] = [];

  const documentsOverdue = input.tasks.filter(
    (task) =>
      !task.archived_at &&
      isTaskActiveForDeadline(task) &&
      isTaskOverdue(task, input.today)
  ).length;
  if (documentsOverdue > 0) {
    items.push({
      id: "documents-overdue",
      labelKey: "attentionDocumentsOverdue",
      count: documentsOverdue,
      href: "/documents?deadline=overdue",
      severity: "critical",
    });
  }

  const detailingUnpaid = input.detailingOrders.filter(
    (order) =>
      order.status === "delivered" &&
      (order.payment_status === "unpaid" ||
        order.payment_status === "partially_paid")
  ).length;
  if (detailingUnpaid > 0) {
    items.push({
      id: "detailing-unpaid",
      labelKey: "attentionDetailingUnpaid",
      count: detailingUnpaid,
      href: "/detailing/orders?payment=unpaid",
      severity: "warning",
    });
  }

  const detailingReady = input.detailingOrders.filter(
    (order) => order.status === "ready"
  ).length;
  if (detailingReady > 0) {
    items.push({
      id: "detailing-ready",
      labelKey: "attentionDetailingReady",
      count: detailingReady,
      href: "/detailing/orders?status=ready",
      severity: "info",
    });
  }

  const soldMissingPrice = input.cars.filter(
    (car) =>
      car.status === "sold" &&
      (car.actual_sale_price == null || Number(car.actual_sale_price) <= 0)
  ).length;
  if (soldMissingPrice > 0) {
    items.push({
      id: "sold-missing-price",
      labelKey: "attentionSoldMissingPrice",
      count: soldMissingPrice,
      href: "/cars?status=sold",
      severity: "warning",
    });
  }

  const activeMissingSalePrice = input.cars.filter((car) => {
    if (!isCarActive(car) || isCarSold(car)) return false;
    return car.sale_price == null || Number(car.sale_price) <= 0;
  }).length;
  if (activeMissingSalePrice > 0) {
    items.push({
      id: "active-missing-sale-price",
      labelKey: "attentionActiveMissingSalePrice",
      count: activeMissingSalePrice,
      href: "/cars?status=in_stock",
      severity: "warning",
    });
  }

  return items;
}

export function sortOverdueTasks(
  tasks: DocumentTaskWithRelations[],
  today: string
) {
  return [...tasks]
    .filter(
      (task) =>
        !task.archived_at &&
        isTaskActiveForDeadline(task) &&
        isTaskOverdue(task, today)
    )
    .sort((a, b) => {
      const priorityDiff =
        Number(b.priority === "urgent") - Number(a.priority === "urgent");
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

export function getOwnerPeriodBounds(period: DashboardPeriod, today: string) {
  return getDashboardPeriodBounds(period, today);
}

export function computeActiveCarProfitSnapshot(
  cars: Car[],
  expensesByCar: Map<number, number>
) {
  let total = 0;
  for (const car of cars) {
    if (!isCarActive(car) || isCarSold(car)) continue;
    total += calculateCarProfit(car, expensesByCar.get(car.id) ?? 0).netProfit;
  }
  return total;
}

export { isTaskDueToday, isTaskActiveForDeadline, isTaskOverdue };
