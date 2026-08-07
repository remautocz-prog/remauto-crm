import { isCarSold, isMissingPositiveNumber } from "@/lib/cars/business-rules";
import { CAR_STATUS_IN_STOCK, CAR_STATUS_SOLD } from "@/lib/constants/status";
import { ACTIVE_DETAILING_ORDER_STATUSES } from "@/lib/constants/detailing";
import {
  addDaysToPragueDate,
  getOverdueDayCount,
  getPragueTodayDateString,
  getTaskDueDate,
  isTaskActiveForDeadline,
} from "@/lib/documents/deadline";
import {
  isHighPriorityTask,
  isTaskDueTomorrow,
} from "@/lib/documents/employee-dashboard";
import { isTaskDueToday, isTaskOverdue } from "@/lib/documents/helpers";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export const OWNER_ATTENTION_STOCK_AGE_DAYS = 90;
export const OWNER_ATTENTION_READY_WAIT_DAYS = 2;
export const OWNER_ATTENTION_PRIORITY_SOON_DAYS = 7;

export type OwnerAttentionModule = "documents" | "detailing" | "cars";

export type OwnerAttentionReasonCategory =
  | "document_overdue"
  | "document_due_today"
  | "document_high_priority_soon"
  | "detailing_unpaid"
  | "detailing_partially_paid"
  | "detailing_ready"
  | "detailing_ready_waiting"
  | "detailing_overdue_completion"
  | "detailing_missing_vehicle_expense"
  | "car_sold_missing_actual_price"
  | "car_active_missing_planned_price"
  | "car_long_in_stock";

export type OwnerAttentionPriority = "critical" | "high" | "medium";

export type OwnerAttentionReasonKey =
  | "attentionReasonDocumentOverdue"
  | "attentionReasonDocumentDueToday"
  | "attentionReasonDocumentHighPrioritySoon"
  | "attentionReasonDetailingUnpaid"
  | "attentionReasonDetailingPartiallyPaid"
  | "attentionReasonDetailingReady"
  | "attentionReasonDetailingReadyWaiting"
  | "attentionReasonDetailingOverdueCompletion"
  | "attentionReasonDetailingMissingVehicleExpense"
  | "attentionReasonCarSoldMissingActualPrice"
  | "attentionReasonCarActiveMissingPlannedPrice"
  | "attentionReasonCarLongInStock";

export type OwnerAttentionRow = {
  id: string;
  module: OwnerAttentionModule;
  entityId: string;
  reasonCategory: OwnerAttentionReasonCategory;
  priority: OwnerAttentionPriority;
  title: string;
  subtitle: string;
  reasonKey: OwnerAttentionReasonKey;
  reasonParams?: Record<string, string | number>;
  href: string;
  ageDays?: number;
  sortTimestamp: string;
  documentTask?: { id: number; status: string };
  detailingOrder?: {
    id: string;
    status: DetailingOrderWithServices["status"];
    payment_status: DetailingOrderWithServices["payment_status"];
    final_price: number;
    paid_amount: number;
    remaining_amount: number;
  };
  car?: Pick<Car, "id" | "status" | "brand" | "model" | "year" | "business_model" | "client_id" | "sale_price" | "actual_sale_price" | "purchase_price">;
};

export type OwnerAttentionSummary = {
  critical: number;
  high: number;
  total: number;
};

const PRIORITY_RANK: Record<OwnerAttentionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const CAR_ACTIVE_STATUSES = [CAR_STATUS_IN_STOCK, "reserved", "in_transit"] as const;

function attentionKey(
  module: OwnerAttentionModule,
  entityId: string | number,
  reasonCategory: OwnerAttentionReasonCategory
) {
  return `${module}:${entityId}:${reasonCategory}`;
}

function daysBetween(fromDate: string, toDate: string) {
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const fromMs = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toMs = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.floor((toMs - fromMs) / 86_400_000);
}

function isCarActiveInventory(car: Car) {
  if (isCarSold(car) || car.status === CAR_STATUS_SOLD) return false;
  return CAR_ACTIVE_STATUSES.includes(
    car.status as (typeof CAR_ACTIVE_STATUSES)[number]
  );
}

function getDocumentTaskTitle(task: DocumentTaskWithRelations) {
  const service =
    task.custom_service_name?.trim() ||
    task.service_type?.trim() ||
    task.work_type?.trim() ||
    `#${task.id}`;
  const vehicle = getDocumentVehicleTitle(task, task.car, "—");
  return { service, vehicle };
}

function isTaskDueWithinDays(
  task: DocumentTaskWithRelations,
  today: string,
  days: number
) {
  if (!isTaskActiveForDeadline(task)) return false;
  const due = getTaskDueDate(task);
  if (!due || due < today) return false;
  const horizon = addDaysToPragueDate(days, today);
  return due <= horizon;
}

function isDetailingReadyWaiting(order: DetailingOrderWithServices, today: string) {
  if (order.status !== "ready") return false;
  const updatedDate = order.updated_at.slice(0, 10);
  return daysBetween(updatedDate, today) >= OWNER_ATTENTION_READY_WAIT_DAYS;
}

function isDetailingOverdueCompletion(order: DetailingOrderWithServices, today: string) {
  if (!(ACTIVE_DETAILING_ORDER_STATUSES as readonly string[]).includes(order.status)) {
    return false;
  }
  if (order.status === "ready" || order.status === "delivered") return false;
  const expected = order.expected_completion_at?.slice(0, 10);
  return Boolean(expected && expected < today);
}

function upsertAttentionItem(
  map: Map<string, OwnerAttentionRow>,
  item: OwnerAttentionRow
) {
  const existing = map.get(item.id);
  if (!existing) {
    map.set(item.id, item);
    return;
  }

  if (PRIORITY_RANK[item.priority] < PRIORITY_RANK[existing.priority]) {
    map.set(item.id, {
      ...item,
      reasonParams: {
        ...existing.reasonParams,
        ...item.reasonParams,
      },
    });
  }
}

export function buildOwnerAttentionRows(input: {
  tasks: DocumentTaskWithRelations[];
  cars: Car[];
  detailingOrders: DetailingOrderWithServices[];
  detailingExpenseOrderIds: Set<string>;
  today?: string;
}): OwnerAttentionRow[] {
  const today = input.today ?? getPragueTodayDateString();
  const map = new Map<string, OwnerAttentionRow>();

  for (const task of input.tasks) {
    if (task.archived_at || !isTaskActiveForDeadline(task)) continue;

    const { service, vehicle } = getDocumentTaskTitle(task);
    const title = vehicle;
    const subtitle = service;
    const href = `/documents/${task.id}`;
    const base = {
      module: "documents" as const,
      entityId: String(task.id),
      title,
      subtitle,
      href,
      documentTask: { id: task.id, status: task.status },
    };

    if (isTaskOverdue(task, today)) {
      const overdueDays = getOverdueDayCount(task, today);
      const due = getTaskDueDate(task) ?? task.created_at.slice(0, 10);
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("documents", task.id, "document_overdue"),
        reasonCategory: "document_overdue",
        priority: "critical",
        reasonKey: "attentionReasonDocumentOverdue",
        reasonParams: {
          days: overdueDays,
          ...(isHighPriorityTask(task) ? { highPriority: 1 } : {}),
        },
        ageDays: overdueDays,
        sortTimestamp: due,
      });
      continue;
    }

    if (isTaskDueToday(task, today)) {
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("documents", task.id, "document_due_today"),
        reasonCategory: "document_due_today",
        priority: "high",
        reasonKey: "attentionReasonDocumentDueToday",
        sortTimestamp: getTaskDueDate(task) ?? today,
      });
      continue;
    }

    if (
      isHighPriorityTask(task) &&
      (isTaskDueTomorrow(task, today) ||
        isTaskDueWithinDays(task, today, OWNER_ATTENTION_PRIORITY_SOON_DAYS))
    ) {
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("documents", task.id, "document_high_priority_soon"),
        reasonCategory: "document_high_priority_soon",
        priority: "medium",
        reasonKey: "attentionReasonDocumentHighPrioritySoon",
        reasonParams: {
          days: Math.max(
            1,
            daysBetween(today, getTaskDueDate(task) ?? today)
          ),
        },
        sortTimestamp: getTaskDueDate(task) ?? task.created_at.slice(0, 10),
      });
    }
  }

  for (const order of input.detailingOrders) {
    if (order.archived_at || order.status === "cancelled") continue;

    const title = order.order_number;
    const subtitle = order.vehicle_make_model;
    const href = `/detailing/orders/${order.id}`;
    const base = {
      module: "detailing" as const,
      entityId: order.id,
      title,
      subtitle,
      href,
      detailingOrder: {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        final_price: order.final_price,
        paid_amount: order.paid_amount,
        remaining_amount: order.remaining_amount,
      },
    };

    if (
      order.status === "delivered" &&
      order.payment_status === "unpaid"
    ) {
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("detailing", order.id, "detailing_unpaid"),
        reasonCategory: "detailing_unpaid",
        priority: "critical",
        reasonKey: "attentionReasonDetailingUnpaid",
        sortTimestamp: order.actual_completion_at ?? order.updated_at,
      });
      continue;
    }

    if (
      order.status === "delivered" &&
      order.payment_status === "partially_paid"
    ) {
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("detailing", order.id, "detailing_partially_paid"),
        reasonCategory: "detailing_partially_paid",
        priority: "high",
        reasonKey: "attentionReasonDetailingPartiallyPaid",
        sortTimestamp: order.actual_completion_at ?? order.updated_at,
      });
      continue;
    }

    if (order.status === "ready") {
      const waiting = isDetailingReadyWaiting(order, today);
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey(
          "detailing",
          order.id,
          waiting ? "detailing_ready_waiting" : "detailing_ready"
        ),
        reasonCategory: waiting ? "detailing_ready_waiting" : "detailing_ready",
        priority: waiting ? "high" : "high",
        reasonKey: waiting
          ? "attentionReasonDetailingReadyWaiting"
          : "attentionReasonDetailingReady",
        reasonParams: waiting
          ? { days: daysBetween(order.updated_at.slice(0, 10), today) }
          : undefined,
        sortTimestamp: order.updated_at,
      });
      continue;
    }

    if (isDetailingOverdueCompletion(order, today)) {
      const expected = order.expected_completion_at!.slice(0, 10);
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("detailing", order.id, "detailing_overdue_completion"),
        reasonCategory: "detailing_overdue_completion",
        priority: "medium",
        reasonKey: "attentionReasonDetailingOverdueCompletion",
        reasonParams: { days: daysBetween(expected, today) },
        ageDays: daysBetween(expected, today),
        sortTimestamp: expected,
      });
      continue;
    }

    if (
      order.status === "delivered" &&
      order.car_id != null &&
      order.final_price > 0 &&
      !input.detailingExpenseOrderIds.has(order.id)
    ) {
      upsertAttentionItem(map, {
        ...base,
        id: attentionKey("detailing", order.id, "detailing_missing_vehicle_expense"),
        reasonCategory: "detailing_missing_vehicle_expense",
        priority: "medium",
        reasonKey: "attentionReasonDetailingMissingVehicleExpense",
        sortTimestamp: order.actual_completion_at ?? order.updated_at,
      });
    }
  }

  for (const car of input.cars) {
    const title = `${car.brand} ${car.model}`.trim();
    const subtitle = car.registration_number ?? car.stock_number ?? `#${car.id}`;
    const href = `/cars/${car.id}`;

    if (
      (isCarSold(car) || car.status === CAR_STATUS_SOLD) &&
      isMissingPositiveNumber(car.actual_sale_price)
    ) {
      upsertAttentionItem(map, {
        id: attentionKey("cars", car.id, "car_sold_missing_actual_price"),
        module: "cars",
        entityId: String(car.id),
        reasonCategory: "car_sold_missing_actual_price",
        priority: "critical",
        title,
        subtitle,
        reasonKey: "attentionReasonCarSoldMissingActualPrice",
        href,
        sortTimestamp: car.sale_date ?? car.updated_at,
        car: {
          id: car.id,
          status: car.status,
          brand: car.brand,
          model: car.model,
          year: car.year,
          business_model: car.business_model,
          client_id: car.client_id,
          sale_price: car.sale_price,
          actual_sale_price: car.actual_sale_price,
          purchase_price: car.purchase_price,
        },
      });
      continue;
    }

    if (
      isCarActiveInventory(car) &&
      isMissingPositiveNumber(car.sale_price)
    ) {
      upsertAttentionItem(map, {
        id: attentionKey("cars", car.id, "car_active_missing_planned_price"),
        module: "cars",
        entityId: String(car.id),
        reasonCategory: "car_active_missing_planned_price",
        priority: "medium",
        title,
        subtitle,
        reasonKey: "attentionReasonCarActiveMissingPlannedPrice",
        href,
        sortTimestamp: car.created_at,
        car: {
          id: car.id,
          status: car.status,
          brand: car.brand,
          model: car.model,
          year: car.year,
          business_model: car.business_model,
          client_id: car.client_id,
          sale_price: car.sale_price,
          actual_sale_price: car.actual_sale_price,
          purchase_price: car.purchase_price,
        },
      });
      continue;
    }

    if (
      car.status === CAR_STATUS_IN_STOCK &&
      car.purchase_date &&
      daysBetween(car.purchase_date, today) >= OWNER_ATTENTION_STOCK_AGE_DAYS
    ) {
      const ageDays = daysBetween(car.purchase_date, today);
      upsertAttentionItem(map, {
        id: attentionKey("cars", car.id, "car_long_in_stock"),
        module: "cars",
        entityId: String(car.id),
        reasonCategory: "car_long_in_stock",
        priority: "medium",
        title,
        subtitle,
        reasonKey: "attentionReasonCarLongInStock",
        reasonParams: { days: ageDays },
        href,
        ageDays,
        sortTimestamp: car.purchase_date,
        car: {
          id: car.id,
          status: car.status,
          brand: car.brand,
          model: car.model,
          year: car.year,
          business_model: car.business_model,
          client_id: car.client_id,
          sale_price: car.sale_price,
          actual_sale_price: car.actual_sale_price,
          purchase_price: car.purchase_price,
        },
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.sortTimestamp.localeCompare(b.sortTimestamp);
  });
}

export function summarizeOwnerAttention(items: OwnerAttentionRow[]): OwnerAttentionSummary {
  let critical = 0;
  let high = 0;

  for (const item of items) {
    if (item.priority === "critical") critical += 1;
    if (item.priority === "high") high += 1;
  }

  return {
    critical,
    high,
    total: items.length,
  };
}
