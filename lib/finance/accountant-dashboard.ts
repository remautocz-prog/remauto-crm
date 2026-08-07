import { isCarSold, isMissingPositiveNumber } from "@/lib/cars/business-rules";
import { CAR_STATUS_SOLD } from "@/lib/constants/status";
import { COMPLETED_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
import { isDateWithinRange } from "@/lib/date-range/filter";
import {
  getDocumentFinanceSummary,
  isCompletedButUnpaid,
  isTaskCompleted,
} from "@/lib/documents/helpers";
import { getDocumentVehicleTitle } from "@/lib/documents/vehicle";
import { getCustomerDisplayName } from "@/lib/detailing/validation";
import { roundMoney } from "@/lib/detailing/pricing";
import type {
  AccountantExpenseRow,
  AccountantFinancialTask,
  AccountantIncomeBySource,
  AccountantKpis,
  AccountantPaymentRow,
} from "@/lib/types/accountant-dashboard";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

function daysBetween(fromDate: string, toDate: string) {
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const fromMs = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toMs = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.floor((toMs - fromMs) / 86_400_000);
}

function isTimestampInBounds(
  value: string | null | undefined,
  bounds: DashboardPeriodBounds
) {
  if (!value || !bounds.start || !bounds.end) return false;
  return isDateWithinRange(value.slice(0, 10), bounds.start, bounds.end);
}

function getDocumentClientLabel(task: DocumentTaskWithRelations) {
  return (
    task.client?.full_name?.trim() ||
    task.client?.company?.trim() ||
    "—"
  );
}

function getDocumentVehicleLabel(task: DocumentTaskWithRelations) {
  return getDocumentVehicleTitle(task, task.car, "—");
}

export function buildDocumentPaymentRow(
  task: DocumentTaskWithRelations,
  today: string
): AccountantPaymentRow | null {
  const finance = getDocumentFinanceSummary(task);
  if (finance.paymentStatus === "paid" || finance.outstandingBalance <= 0) {
    return null;
  }

  const referenceDate =
    task.completed_at?.slice(0, 10) ??
    task.due_date ??
    task.deadline ??
    task.created_at.slice(0, 10);
  const daysOverdue =
    referenceDate && referenceDate < today
      ? daysBetween(referenceDate, today)
      : null;

  return {
    id: `documents:${task.id}`,
    module: "documents",
    entityId: String(task.id),
    client: getDocumentClientLabel(task),
    vehicle: getDocumentVehicleLabel(task),
    amount: finance.servicePrice,
    paid: finance.paidAmount,
    remaining: finance.outstandingBalance,
    status: finance.paymentStatus,
    daysOverdue,
    occurredAt: task.paid_at ?? task.completed_at ?? task.updated_at,
    href: `/documents/${task.id}`,
    paymentMethod: task.payment_method,
  };
}

export function buildDetailingPaymentRow(
  order: DetailingOrderWithServices,
  today: string
): AccountantPaymentRow | null {
  if (order.status !== "delivered") return null;
  if (order.payment_status === "paid" || order.remaining_amount <= 0) {
    return null;
  }

  const referenceDate =
    order.actual_completion_at?.slice(0, 10) ?? order.updated_at.slice(0, 10);
  const daysOverdue =
    referenceDate && referenceDate < today
      ? daysBetween(referenceDate, today)
      : null;

  return {
    id: `detailing:${order.id}`,
    module: "detailing",
    entityId: order.id,
    client: getCustomerDisplayName(order),
    vehicle: order.vehicle_make_model || order.registration_number || "—",
    amount: order.final_price,
    paid: order.paid_amount,
    remaining: order.remaining_amount,
    status: order.payment_status,
    daysOverdue,
    occurredAt: order.updated_at,
    href: `/detailing/orders/${order.id}`,
    paymentMethod: order.payment_method,
  };
}

export function buildCarFinancialRow(
  car: Car,
  today: string
): AccountantPaymentRow | null {
  if (!isCarSold(car) && car.status !== CAR_STATUS_SOLD) return null;
  if (!isMissingPositiveNumber(car.actual_sale_price)) return null;

  const referenceDate = car.sale_date?.slice(0, 10) ?? car.updated_at.slice(0, 10);
  const daysOverdue =
    referenceDate && referenceDate < today
      ? daysBetween(referenceDate, today)
      : null;

  return {
    id: `cars:${car.id}`,
    module: "cars",
    entityId: String(car.id),
    client: "—",
    vehicle: [car.brand, car.model, car.year].filter(Boolean).join(" "),
    amount: Number(car.sale_price ?? 0),
    paid: 0,
    remaining: Number(car.sale_price ?? 0),
    status: "missing_actual_price",
    daysOverdue,
    occurredAt: car.sale_date ?? car.updated_at,
    href: `/cars/${car.id}`,
    paymentMethod: null,
  };
}

export function sortReceivableRows(rows: AccountantPaymentRow[]) {
  return [...rows].sort((a, b) => {
    const overdueDiff = (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
    if (overdueDiff !== 0) return overdueDiff;
    return b.remaining - a.remaining;
  });
}

export function computeDocumentsPaymentsInPeriod(
  tasks: DocumentTaskWithRelations[],
  bounds: DashboardPeriodBounds
) {
  let total = 0;
  for (const task of tasks) {
    const finance = getDocumentFinanceSummary(task);
    if (finance.paidAmount <= 0) continue;
    const paidAt = task.paid_at ?? null;
    if (!isTimestampInBounds(paidAt, bounds)) continue;
    total += finance.paidAmount;
  }
  return roundMoney(total);
}

export function computeCarProceedsInPeriod(cars: Car[], bounds: DashboardPeriodBounds) {
  let total = 0;
  for (const car of cars) {
    if (!isCarSold(car)) continue;
    const saleDate = car.sale_date ?? null;
    if (!isTimestampInBounds(saleDate, bounds)) continue;
    const amount = Number(car.actual_sale_price ?? 0);
    if (amount <= 0) continue;
    total += amount;
  }
  return roundMoney(total);
}

export function computeDetailingPaymentsInPeriod(
  orders: DetailingOrderWithServices[],
  bounds: DashboardPeriodBounds
) {
  let total = 0;
  for (const order of orders) {
    if (order.status !== "delivered") continue;
    if (order.paid_amount <= 0) continue;
    if (!isTimestampInBounds(order.updated_at, bounds)) continue;
    total += order.paid_amount;
  }
  return roundMoney(total);
}

export function computeIncomeBySource(input: {
  tasks: DocumentTaskWithRelations[];
  cars: Car[];
  orders: DetailingOrderWithServices[];
  bounds: DashboardPeriodBounds;
}): AccountantIncomeBySource {
  const documents = computeDocumentsPaymentsInPeriod(input.tasks, input.bounds);
  const cars = computeCarProceedsInPeriod(input.cars, input.bounds);
  const detailing = computeDetailingPaymentsInPeriod(input.orders, input.bounds);

  return {
    documents,
    cars,
    detailing,
    total: roundMoney(documents + cars + detailing),
  };
}

export function computeIncomingToday(
  tasks: DocumentTaskWithRelations[],
  cars: Car[],
  orders: DetailingOrderWithServices[],
  todayBounds: DashboardPeriodBounds
) {
  return computeIncomeBySource({
    tasks,
    cars,
    orders,
    bounds: todayBounds,
  }).total;
}

export function buildOutstandingReceivables(input: {
  tasks: DocumentTaskWithRelations[];
  orders: DetailingOrderWithServices[];
  cars: Car[];
  today: string;
}) {
  const rows: AccountantPaymentRow[] = [];

  for (const task of input.tasks) {
    if (task.archived_at) continue;
    const row = buildDocumentPaymentRow(task, input.today);
    if (row) rows.push(row);
  }

  for (const order of input.orders) {
    if (order.archived_at) continue;
    const row = buildDetailingPaymentRow(order, input.today);
    if (row) rows.push(row);
  }

  for (const car of input.cars) {
    const row = buildCarFinancialRow(car, input.today);
    if (row) rows.push(row);
  }

  return sortReceivableRows(rows);
}

export function buildRecentPayments(input: {
  tasks: DocumentTaskWithRelations[];
  orders: DetailingOrderWithServices[];
  cars: Car[];
  limit?: number;
}): AccountantPaymentRow[] {
  const rows: AccountantPaymentRow[] = [];

  for (const task of input.tasks) {
    const finance = getDocumentFinanceSummary(task);
    if (finance.paidAmount <= 0) continue;
    rows.push({
      id: `recent-documents:${task.id}`,
      module: "documents",
      entityId: String(task.id),
      client: getDocumentClientLabel(task),
      vehicle: getDocumentVehicleLabel(task),
      amount: finance.servicePrice,
      paid: finance.paidAmount,
      remaining: finance.outstandingBalance,
      status: finance.paymentStatus,
      daysOverdue: null,
      occurredAt: task.paid_at ?? task.updated_at,
      href: `/documents/${task.id}`,
      paymentMethod: task.payment_method,
    });
  }

  for (const order of input.orders) {
    if (order.status !== "delivered" || order.paid_amount <= 0) continue;
    rows.push({
      id: `recent-detailing:${order.id}`,
      module: "detailing",
      entityId: order.id,
      client: getCustomerDisplayName(order),
      vehicle: order.vehicle_make_model || order.registration_number || "—",
      amount: order.final_price,
      paid: order.paid_amount,
      remaining: order.remaining_amount,
      status: order.payment_status,
      daysOverdue: null,
      occurredAt: order.updated_at,
      href: `/detailing/orders/${order.id}`,
      paymentMethod: order.payment_method,
    });
  }

  for (const car of input.cars) {
    if (!isCarSold(car)) continue;
    const paid = Number(car.actual_sale_price ?? 0);
    if (paid <= 0) continue;
    rows.push({
      id: `recent-cars:${car.id}`,
      module: "cars",
      entityId: String(car.id),
      client: "—",
      vehicle: [car.brand, car.model, car.year].filter(Boolean).join(" "),
      amount: paid,
      paid,
      remaining: 0,
      status: "paid",
      daysOverdue: null,
      occurredAt: car.sale_date ?? car.updated_at,
      href: `/cars/${car.id}`,
      paymentMethod: null,
    });
  }

  return rows
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, input.limit ?? 20);
}

export function countExpensesAwaitingVerification(input: {
  orders: DetailingOrderWithServices[];
  detailingExpenseOrderIds: Set<string>;
  cars: Car[];
}) {
  let count = 0;

  for (const order of input.orders) {
    if (order.status !== "delivered" || !order.car_id) continue;
    if (input.detailingExpenseOrderIds.has(order.id)) continue;
    count += 1;
  }

  for (const car of input.cars) {
    if (!isCarSold(car) && car.status !== CAR_STATUS_SOLD) continue;
    if (isMissingPositiveNumber(car.actual_sale_price)) count += 1;
  }

  return count;
}

export function buildFinancialTasks(input: {
  tasks: DocumentTaskWithRelations[];
  orders: DetailingOrderWithServices[];
  cars: Car[];
  detailingExpenseOrderIds: Set<string>;
  today: string;
  limit?: number;
}): AccountantFinancialTask[] {
  const tasks: AccountantFinancialTask[] = [];

  for (const task of input.tasks) {
    if (task.archived_at) continue;

    if (isCompletedButUnpaid(task)) {
      tasks.push({
        id: `task-outstanding-${task.id}`,
        kind: "outstanding_invoice",
        title: getDocumentVehicleLabel(task),
        subtitle: getDocumentClientLabel(task),
        href: `/documents/${task.id}`,
        priority: "high",
      });
      continue;
    }

    const finance = getDocumentFinanceSummary(task);
    if (
      isTaskCompleted(task) &&
      finance.paymentStatus === "partially_paid"
    ) {
      tasks.push({
        id: `task-verify-${task.id}`,
        kind: "verify_payment",
        title: getDocumentVehicleLabel(task),
        subtitle: getDocumentClientLabel(task),
        href: `/documents/${task.id}`,
        priority: "medium",
      });
    }
  }

  for (const order of input.orders) {
    if (order.archived_at || order.status !== "delivered") continue;
    if (order.payment_status === "unpaid" || order.payment_status === "partially_paid") {
      tasks.push({
        id: `task-detailing-payment-${order.id}`,
        kind: order.payment_status === "unpaid" ? "payment_reminder" : "verify_payment",
        title: getCustomerDisplayName(order),
        subtitle: order.vehicle_make_model,
        href: `/detailing/orders/${order.id}`,
        priority: order.payment_status === "unpaid" ? "high" : "medium",
      });
    }

    if (
      order.car_id &&
      !input.detailingExpenseOrderIds.has(order.id)
    ) {
      tasks.push({
        id: `task-missing-expense-${order.id}`,
        kind: "missing_vehicle_expense",
        title: getCustomerDisplayName(order),
        subtitle: order.vehicle_make_model,
        href: `/detailing/orders/${order.id}`,
        priority: "medium",
      });
    }
  }

  for (const car of input.cars) {
    if (!isCarSold(car) && car.status !== CAR_STATUS_SOLD) continue;
    if (!isMissingPositiveNumber(car.actual_sale_price)) continue;
    tasks.push({
      id: `task-car-price-${car.id}`,
      kind: "missing_sale_price",
      title: [car.brand, car.model, car.year].filter(Boolean).join(" "),
      subtitle: car.registration_number ?? car.stock_number ?? "—",
      href: `/cars/${car.id}`,
      priority: "high",
    });
  }

  const priorityRank = { high: 0, medium: 1 } as const;
  return tasks
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, input.limit ?? 12);
}

export function buildExpenseRows(input: {
  carExpenses: {
    id: number;
    car_id: number;
    category: string;
    amount: number;
    expense_date: string;
    description: string | null;
  }[];
  detailingExpenses: {
    id: string;
    category: string;
    amount: number;
    expense_date: string;
    description: string | null;
  }[];
  tasks: DocumentTaskWithRelations[];
  bounds: DashboardPeriodBounds;
  today: string;
}) {
  const recent: AccountantExpenseRow[] = [];

  for (const expense of input.carExpenses) {
    recent.push({
      id: `car-expense-${expense.id}`,
      module: "cars",
      label: expense.description?.trim() || expense.category,
      amount: Number(expense.amount ?? 0),
      date: expense.expense_date.slice(0, 10),
      href: `/cars/${expense.car_id}`,
    });
  }

  for (const expense of input.detailingExpenses) {
    recent.push({
      id: `detailing-expense-${expense.id}`,
      module: "detailing",
      label: expense.description?.trim() || expense.category,
      amount: Number(expense.amount ?? 0),
      date: expense.expense_date.slice(0, 10),
      href: "/detailing/expenses",
    });
  }

  for (const task of input.tasks) {
    if (task.archived_at) continue;
    if (!COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)) continue;
    const completedAt = task.completed_at?.slice(0, 10);
    if (
      !completedAt ||
      !input.bounds.start ||
      !input.bounds.end ||
      !isDateWithinRange(completedAt, input.bounds.start, input.bounds.end)
    ) {
      continue;
    }
    const finance = getDocumentFinanceSummary(task);
    if (finance.costPrice <= 0) continue;
    recent.push({
      id: `documents-cost-${task.id}`,
      module: "documents",
      label: getDocumentVehicleLabel(task),
      amount: finance.costPrice,
      date: completedAt,
      href: `/documents/${task.id}`,
    });
  }

  recent.sort((a, b) => b.date.localeCompare(a.date));

  const periodRows = recent.filter(
    (row) =>
      input.bounds.start &&
      input.bounds.end &&
      isDateWithinRange(row.date, input.bounds.start, input.bounds.end)
  );
  const todayRows = recent.filter((row) => row.date === input.today);

  const byModule = {
    cars: 0,
    detailing: 0,
    documents: 0,
  };

  for (const row of periodRows) {
    byModule[row.module] += row.amount;
  }

  return {
    periodTotal: roundMoney(
      periodRows.reduce((sum, row) => sum + row.amount, 0)
    ),
    todayTotal: roundMoney(
      todayRows.reduce((sum, row) => sum + row.amount, 0)
    ),
    byModule: {
      cars: roundMoney(byModule.cars),
      detailing: roundMoney(byModule.detailing),
      documents: roundMoney(byModule.documents),
    },
    recent: recent.slice(0, 12),
  };
}

export function computeAccountantKpis(input: {
  tasks: DocumentTaskWithRelations[];
  cars: Car[];
  orders: DetailingOrderWithServices[];
  receivables: AccountantPaymentRow[];
  expensesAwaitingVerification: number;
  financialTasks: AccountantFinancialTask[];
  todayBounds: DashboardPeriodBounds;
}): AccountantKpis {
  const incomingToday = computeIncomingToday(
    input.tasks,
    input.cars,
    input.orders,
    input.todayBounds
  );

  return {
    incomingToday,
    unpaidCount: input.receivables.length,
    outstandingReceivables: roundMoney(
      input.receivables.reduce((sum, row) => sum + row.remaining, 0)
    ),
    expensesAwaitingVerification: input.expensesAwaitingVerification,
    financialTasksToday: input.financialTasks.length,
  };
}
