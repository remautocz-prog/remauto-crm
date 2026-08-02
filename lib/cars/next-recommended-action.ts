import { isCarSold, isMissingPositiveNumber } from "@/lib/cars/business-rules";
import { CAR_STATUS_SOLD } from "@/lib/constants/status";
import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import { ACTIVE_DETAILING_ORDER_STATUSES } from "@/lib/constants/detailing";
import {
  isTaskActiveForDeadline,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import type { Car, CarExpense } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type {
  DocumentTemplate,
  GeneratedDocument,
} from "@/lib/types/document-templates";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

const SALE_DOCUMENT_CATEGORIES = ["purchase_agreement", "handover_protocol"] as const;

export const CAR_NEXT_ACTION_IDS = [
  "record_actual_sale_price",
  "resolve_overdue_documents",
  "prepare_sale_documents",
  "follow_detailing_order",
  "add_detailing_expense",
  "send_to_detailing",
  "create_document_task",
  "complete_document_task",
  "set_planned_sale_price",
  "mark_as_sold",
] as const;

export type CarNextActionId = (typeof CAR_NEXT_ACTION_IDS)[number];

export type CarNextRecommendedAction = {
  id: CarNextActionId;
  href?: string;
  trigger?: "mark_sold" | "scroll_sale_documents";
};

export type CarNextActionContext = {
  car: Car;
  expenses: CarExpense[];
  documentTasks: DocumentTaskWithRelations[];
  detailingOrders: DetailingOrderWithServices[];
  generatedDocuments: GeneratedDocument[];
  documentTemplates: DocumentTemplate[];
  today?: string;
};

function activeDetailingOrder(orders: DetailingOrderWithServices[]) {
  return orders.find((order) =>
    (ACTIVE_DETAILING_ORDER_STATUSES as readonly string[]).includes(order.status)
  );
}

function deliveredOrdersMissingExpense(
  orders: DetailingOrderWithServices[],
  expenses: CarExpense[]
) {
  const linkedOrderIds = new Set(
    expenses
      .map((expense) => expense.source_detailing_order_id)
      .filter((value): value is string => Boolean(value))
  );

  return orders.find(
    (order) =>
      order.status === "delivered" &&
      order.final_price > 0 &&
      !linkedOrderIds.has(order.id)
  );
}

function firstOverdueTask(tasks: DocumentTaskWithRelations[], today: string) {
  return tasks.find(
    (task) =>
      !task.archived_at &&
      isTaskActiveForDeadline(task) &&
      isTaskOverdue(task, today)
  );
}

function openDocumentTasks(tasks: DocumentTaskWithRelations[]) {
  return tasks.filter(
    (task) =>
      !task.archived_at &&
      ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

function missingSaleDocumentCategories(input: CarNextActionContext) {
  const templateCategoryById = new Map(
    input.documentTemplates.map((template) => [template.id, template.category])
  );

  const generatedCategories = new Set<string>();
  for (const document of input.generatedDocuments) {
    if (document.archived_at) continue;
    const category =
      document.template?.category ??
      (document.template_id
        ? templateCategoryById.get(document.template_id)
        : null);
    if (category) generatedCategories.add(category);
  }

  return SALE_DOCUMENT_CATEGORIES.filter(
    (category) =>
      input.documentTemplates.some((template) => template.category === category) &&
      !generatedCategories.has(category)
  );
}

function hasUsableDetailingHistory(orders: DetailingOrderWithServices[]) {
  return orders.some((order) => order.status !== "cancelled");
}

function isActiveInventoryCar(car: Car) {
  return !isCarSold(car) && car.status !== CAR_STATUS_SOLD;
}

function allDocumentsCompleted(tasks: DocumentTaskWithRelations[]) {
  const relevant = tasks.filter((task) => !task.archived_at);
  if (relevant.length === 0) return false;
  return relevant.every((task) =>
    COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

function nonArchivedDocumentTasks(tasks: DocumentTaskWithRelations[]) {
  return tasks.filter((task) => !task.archived_at);
}

export function resolveCarNextRecommendedAction(
  input: CarNextActionContext
): CarNextRecommendedAction | null {
  const today = input.today ?? getPragueTodayDateString();
  const { car, expenses, documentTasks, detailingOrders } = input;
  const sold = isCarSold(car) || car.status === CAR_STATUS_SOLD;
  const overdueTask = firstOverdueTask(documentTasks, today);

  if (sold && isMissingPositiveNumber(car.actual_sale_price)) {
    return {
      id: "record_actual_sale_price",
      href: `/cars/${car.id}/edit`,
    };
  }

  if (overdueTask) {
    return {
      id: "resolve_overdue_documents",
      href: `/documents/${overdueTask.id}`,
    };
  }

  if (sold) {
    const missingSaleDocs = missingSaleDocumentCategories(input);
    if (missingSaleDocs.length > 0) {
      return {
        id: "prepare_sale_documents",
        trigger: "scroll_sale_documents",
      };
    }
    return null;
  }

  const activeOrder = activeDetailingOrder(detailingOrders);
  if (activeOrder) {
    return {
      id: "follow_detailing_order",
      href: `/detailing/orders/${activeOrder.id}`,
    };
  }

  const unrecordedOrder = deliveredOrdersMissingExpense(detailingOrders, expenses);
  if (unrecordedOrder) {
    return {
      id: "add_detailing_expense",
      href: `/detailing/orders/${unrecordedOrder.id}`,
    };
  }

  if (!hasUsableDetailingHistory(detailingOrders)) {
    return {
      id: "send_to_detailing",
      href: `/detailing/orders/new?car_id=${car.id}`,
    };
  }

  if (nonArchivedDocumentTasks(documentTasks).length === 0) {
    const clientQuery = car.client_id ? `&client_id=${car.client_id}` : "";
    return {
      id: "create_document_task",
      href: `/documents?car_id=${car.id}${clientQuery}`,
    };
  }

  const openTasks = openDocumentTasks(documentTasks);
  if (openTasks.length > 0) {
    return {
      id: "complete_document_task",
      href: `/documents/${openTasks[0].id}`,
    };
  }

  if (
    isActiveInventoryCar(car) &&
    (car.business_model === "owned" || car.business_model === "commission") &&
    isMissingPositiveNumber(car.sale_price)
  ) {
    return {
      id: "set_planned_sale_price",
      href: `/cars/${car.id}/edit`,
    };
  }

  const detailingComplete = detailingOrders.some(
    (order) => order.status === "delivered"
  );

  if (
    isActiveInventoryCar(car) &&
    detailingComplete &&
    allDocumentsCompleted(documentTasks) &&
    !isMissingPositiveNumber(car.sale_price)
  ) {
    return {
      id: "mark_as_sold",
      trigger: "mark_sold",
    };
  }

  return null;
}
