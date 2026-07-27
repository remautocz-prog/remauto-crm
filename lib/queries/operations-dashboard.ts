import { createClient } from "@/lib/supabase/server";
import {
  calculateCarProfit,
  isCarSold,
  shouldCountStatsProfit,
  shouldCountStatsRevenue,
} from "@/lib/cars/business-rules";
import {
  ACTIVE_DOCUMENT_TASK_STATUSES,
  COMPLETED_DOCUMENT_TASK_STATUSES,
  TERMINAL_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/documents";
import { CAR_STATUS_IN_STOCK } from "@/lib/constants/status";
import { buildDashboardActivityFeed } from "@/lib/dashboard/activity-feed";
import {
  getDashboardPeriodBounds,
  isDateWithinPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import { getDocumentsFilterHref } from "@/lib/dashboard/links";
import {
  compareDeadlineNearest,
  getPragueTodayDateString,
} from "@/lib/documents/deadline";
import {
  getDocumentFinanceSummary,
  isTaskActiveForDeadline,
  isTaskDueToday,
  isTaskOverdue,
  isTaskUnassigned,
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import type {
  DashboardAttentionMetrics,
  DashboardBusinessOverview,
  DashboardEmployeeWorkloadRow,
  DashboardFinancialOverview,
  DashboardSectionErrors,
  OperationsDashboardData,
} from "@/lib/types/dashboard";
import type { Car } from "@/lib/types/cars";
import type { Client, ClientNote } from "@/lib/types/clients";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

const TASK_SELECT = `
  *,
  clients:client_id ( id, full_name, company, phone, email, client_type ),
  cars:car_id ( id, brand, model, year, vin, registration_number, client_id ),
  assignee:assigned_to ( id, full_name ),
  document_task_services ( * )
`;

const CAR_ACTIVE_STATUSES = [
  CAR_STATUS_IN_STOCK,
  "reserved",
  "in_transit",
  "in_progress",
  "new",
] as const;

function mapTaskRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  return mergeTaskRelations(mapDocumentTask(row), row);
}

function isActiveDashboardTask(task: DocumentTaskWithRelations) {
  return (
    !task.archived_at &&
    isTaskActiveForDeadline(task) &&
    ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
  );
}

function compareTodaysWork(
  a: DocumentTaskWithRelations,
  b: DocumentTaskWithRelations,
  today: string
) {
  const overdueDiff =
    Number(isTaskOverdue(b, today)) - Number(isTaskOverdue(a, today));
  if (overdueDiff !== 0) return overdueDiff;

  const dueTodayDiff =
    Number(isTaskDueToday(b, today)) - Number(isTaskDueToday(a, today));
  if (dueTodayDiff !== 0) return dueTodayDiff;

  const urgentDiff =
    Number(b.priority === "urgent") - Number(a.priority === "urgent");
  if (urgentDiff !== 0) return urgentDiff;

  const deadlineCmp = compareDeadlineNearest(a, b, today);
  if (deadlineCmp !== 0) return deadlineCmp;

  return (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function isCarActive(car: Car) {
  return CAR_ACTIVE_STATUSES.includes(car.status as (typeof CAR_ACTIVE_STATUSES)[number]);
}

function isTimestampWithinPeriod(
  value: string | null | undefined,
  bounds: ReturnType<typeof getDashboardPeriodBounds>
) {
  if (!value) return false;
  const date = value.slice(0, 10);
  return isDateWithinPeriod(date, bounds);
}

function computeAttentionMetrics(
  tasks: DocumentTaskWithRelations[],
  today: string
): DashboardAttentionMetrics {
  let unpaidDocumentBalance = 0;

  for (const task of tasks) {
    unpaidDocumentBalance += getDocumentFinanceSummary(task).outstandingBalance;
  }

  return {
    overdueOrders: tasks.filter(
      (task) => isActiveDashboardTask(task) && isTaskOverdue(task, today)
    ).length,
    dueTodayOrders: tasks.filter(
      (task) => isActiveDashboardTask(task) && isTaskDueToday(task, today)
    ).length,
    urgentActiveOrders: tasks.filter(
      (task) =>
        task.priority === "urgent" &&
        !TERMINAL_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ).length,
    unassignedActiveOrders: tasks.filter(
      (task) => isActiveDashboardTask(task) && isTaskUnassigned(task)
    ).length,
    unpaidDocumentBalance,
  };
}

function computeFinancialOverview(input: {
  tasks: DocumentTaskWithRelations[];
  cars: Car[];
  expensesByCar: Map<number, number>;
  bounds: ReturnType<typeof getDashboardPeriodBounds>;
}): DashboardFinancialOverview {
  const documents = {
    revenue: 0,
    costs: 0,
    profit: 0,
    collected: 0,
    outstanding: 0,
  };

  for (const task of input.tasks) {
    const finance = getDocumentFinanceSummary(task);
    documents.outstanding += finance.outstandingBalance;

    const completedAt = task.completed_at;
    if (
      completedAt &&
      isTimestampWithinPeriod(completedAt, input.bounds) &&
      COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ) {
      documents.revenue += finance.servicePrice;
      documents.costs += finance.costPrice;
      documents.profit += finance.profit;
    }

    const paidAt = task.paid_at ?? null;
    if (
      finance.paidAmount > 0 &&
      paidAt &&
      isTimestampWithinPeriod(paidAt, input.bounds)
    ) {
      documents.collected += finance.paidAmount;
    }
  }

  const cars = {
    activeInventoryValue: 0,
    soldRevenue: 0,
    soldProfit: 0,
  };

  for (const car of input.cars) {
    const expenses = input.expensesByCar.get(car.id) ?? 0;
    const profitResult = calculateCarProfit(car, expenses);

    if (isCarActive(car) && !isCarSold(car)) {
      cars.activeInventoryValue += Number(car.purchase_price ?? 0);
    }

    const saleDate = car.sale_date ?? car.updated_at;
    if (
      isCarSold(car) &&
      isTimestampWithinPeriod(saleDate, input.bounds) &&
      shouldCountStatsRevenue(car)
    ) {
      cars.soldRevenue += profitResult.revenue;
    }

    if (
      isCarSold(car) &&
      isTimestampWithinPeriod(saleDate, input.bounds) &&
      shouldCountStatsProfit(car)
    ) {
      cars.soldProfit += profitResult.netProfit;
    }
  }

  return {
    documents,
    cars,
    combinedProfit: documents.profit + cars.soldProfit,
  };
}

function computeBusinessOverview(input: {
  tasks: DocumentTaskWithRelations[];
  cars: Car[];
  clients: Client[];
  clientOutstanding: Map<number, number>;
  bounds: ReturnType<typeof getDashboardPeriodBounds>;
  today: string;
}): DashboardBusinessOverview {
  return {
    activeCars: input.cars.filter((car) => isCarActive(car) && !isCarSold(car)).length,
    reservedCars: input.cars.filter((car) => car.status === "reserved").length,
    soldThisPeriod: input.cars.filter(
      (car) =>
        isCarSold(car) &&
        isTimestampWithinPeriod(car.sale_date ?? car.updated_at, input.bounds)
    ).length,
    commissionCars: input.cars.filter(
      (car) =>
        car.business_model === "commission" &&
        isCarActive(car) &&
        !isCarSold(car)
    ).length,
    activeDocumentOrders: input.tasks.filter((task) =>
      ACTIVE_DOCUMENT_TASK_STATUSES.includes(task.status as never)
    ).length,
    completedThisPeriod: input.tasks.filter((task) => {
      const completedAt = task.completed_at;
      return (
        completedAt &&
        isTimestampWithinPeriod(completedAt, input.bounds) &&
        COMPLETED_DOCUMENT_TASK_STATUSES.includes(task.status as never)
      );
    }).length,
    unpaidOrders: input.tasks.filter(
      (task) => getDocumentFinanceSummary(task).outstandingBalance > 0
    ).length,
    overdueOrders: input.tasks.filter(
      (task) => isActiveDashboardTask(task) && isTaskOverdue(task, input.today)
    ).length,
    activeClients: input.clients.filter((client) => client.is_active).length,
    newClientsThisPeriod: input.clients.filter((client) =>
      isTimestampWithinPeriod(client.created_at, input.bounds)
    ).length,
    clientsWithDebt: Array.from(input.clientOutstanding.values()).filter(
      (balance) => balance > 0
    ).length,
  };
}

function computeEmployeeWorkload(
  tasks: DocumentTaskWithRelations[],
  today: string
): DashboardEmployeeWorkloadRow[] {
  const rows = new Map<string, DashboardEmployeeWorkloadRow>();

  for (const task of tasks.filter(isActiveDashboardTask)) {
    const employeeId = task.assigned_to;
    if (!employeeId) continue;

    const existing = rows.get(employeeId) ?? {
      employeeId,
      employeeName: task.assignee?.full_name?.trim() || employeeId,
      activeOrders: 0,
      overdueOrders: 0,
      dueTodayOrders: 0,
      urgentOrders: 0,
      href: getDocumentsFilterHref({ assignedTo: employeeId }),
    };

    existing.activeOrders += 1;
    if (isTaskOverdue(task, today)) existing.overdueOrders += 1;
    if (isTaskDueToday(task, today)) existing.dueTodayOrders += 1;
    if (task.priority === "urgent") existing.urgentOrders += 1;

    rows.set(employeeId, existing);
  }

  const unassignedTasks = tasks.filter(
    (task) => isActiveDashboardTask(task) && isTaskUnassigned(task)
  );

  const result = Array.from(rows.values()).sort((a, b) => {
    if (b.overdueOrders !== a.overdueOrders) {
      return b.overdueOrders - a.overdueOrders;
    }
    return b.activeOrders - a.activeOrders;
  });

  if (unassignedTasks.length > 0) {
    result.push({
      employeeId: null,
      employeeName: "unassigned",
      activeOrders: unassignedTasks.length,
      overdueOrders: unassignedTasks.filter((task) => isTaskOverdue(task, today)).length,
      dueTodayOrders: unassignedTasks.filter((task) => isTaskDueToday(task, today)).length,
      urgentOrders: unassignedTasks.filter((task) => task.priority === "urgent").length,
      href: getDocumentsFilterHref({ unassignedOnly: true }),
    });
  }

  return result;
}

function buildClientOutstandingMap(tasks: DocumentTaskWithRelations[]) {
  const balances = new Map<number, number>();

  for (const task of tasks) {
    if (!task.client_id) continue;
    const outstanding = getDocumentFinanceSummary(task).outstandingBalance;
    if (outstanding <= 0) continue;
    balances.set(
      task.client_id,
      (balances.get(task.client_id) ?? 0) + outstanding
    );
  }

  return balances;
}

function emptyDashboardData(
  period: DashboardPeriod,
  errors: DashboardSectionErrors
): OperationsDashboardData {
  return {
    period,
    attention: {
      overdueOrders: 0,
      dueTodayOrders: 0,
      urgentActiveOrders: 0,
      unassignedActiveOrders: 0,
      unpaidDocumentBalance: 0,
    },
    todaysWork: [],
    financial: {
      documents: {
        revenue: 0,
        costs: 0,
        profit: 0,
        collected: 0,
        outstanding: 0,
      },
      cars: {
        activeInventoryValue: 0,
        soldRevenue: 0,
        soldProfit: 0,
      },
      combinedProfit: 0,
    },
    business: {
      activeCars: 0,
      reservedCars: 0,
      soldThisPeriod: 0,
      commissionCars: 0,
      activeDocumentOrders: 0,
      completedThisPeriod: 0,
      unpaidOrders: 0,
      overdueOrders: 0,
      activeClients: 0,
      newClientsThisPeriod: 0,
      clientsWithDebt: 0,
    },
    employeeWorkload: [],
    recentActivity: [],
    errors,
  };
}

export async function getOperationsDashboardData(
  period: DashboardPeriod
): Promise<OperationsDashboardData> {
  const supabase = await createClient();
  const today = getPragueTodayDateString();
  const bounds = getDashboardPeriodBounds(period, today);
  const errors: DashboardSectionErrors = {};

  const [
    documentsResult,
    carsResult,
    expensesResult,
    clientsResult,
    notesResult,
  ] = await Promise.allSettled([
    supabase.from("document_tasks").select(TASK_SELECT).is("archived_at", null),
    supabase.from("cars").select("*"),
    supabase.from("car_expenses").select("car_id, amount"),
    supabase.from("clients").select("*"),
    supabase
      .from("client_notes")
      .select("*, author:created_by ( id, full_name )")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  let tasks: DocumentTaskWithRelations[] = [];
  if (documentsResult.status === "fulfilled") {
    const { data, error } = documentsResult.value;
    if (error) {
      errors.documents = error.message;
    } else {
      tasks = (data ?? []).map((row) =>
        mapTaskRow(row as Record<string, unknown>)
      );
    }
  } else {
    errors.documents = String(documentsResult.reason);
  }

  let cars: Car[] = [];
  if (carsResult.status === "fulfilled") {
    const { data, error } = carsResult.value;
    if (error) {
      errors.cars = error.message;
    } else {
      cars = (data ?? []) as Car[];
    }
  } else {
    errors.cars = String(carsResult.reason);
  }

  const expensesByCar = new Map<number, number>();
  if (expensesResult.status === "fulfilled") {
    const { data, error } = expensesResult.value;
    if (error) {
      errors.cars = errors.cars ?? error.message;
    } else {
      for (const expense of data ?? []) {
        const carId = Number(expense.car_id);
        expensesByCar.set(
          carId,
          (expensesByCar.get(carId) ?? 0) + Number(expense.amount)
        );
      }
    }
  } else {
    errors.cars = errors.cars ?? String(expensesResult.reason);
  }

  let clients: Client[] = [];
  if (clientsResult.status === "fulfilled") {
    const { data, error } = clientsResult.value;
    if (error) {
      errors.clients = error.message;
    } else {
      clients = (data ?? []) as Client[];
    }
  } else {
    errors.clients = String(clientsResult.reason);
  }

  let notes: ClientNote[] = [];
  if (notesResult.status === "fulfilled") {
    const { data, error } = notesResult.value;
    if (error) {
      errors.notes = error.message;
    } else {
      notes = (data ?? []) as ClientNote[];
    }
  } else {
    errors.notes = String(notesResult.reason);
  }

  if (errors.documents && tasks.length === 0) {
    return emptyDashboardData(period, errors);
  }

  const clientOutstanding = buildClientOutstandingMap(tasks);
  const attention = computeAttentionMetrics(tasks, today);
  const todaysWork = tasks
    .filter(isActiveDashboardTask)
    .sort((a, b) => compareTodaysWork(a, b, today))
    .slice(0, 10);

  const financial = computeFinancialOverview({
    tasks,
    cars,
    expensesByCar,
    bounds,
  });

  const business = computeBusinessOverview({
    tasks,
    cars,
    clients,
    clientOutstanding,
    bounds,
    today,
  });

  const employeeWorkload = computeEmployeeWorkload(tasks, today);

  const recentActivity = buildDashboardActivityFeed({
    clients,
    cars,
    documentTasks: tasks,
    notes,
    period,
    limit: 15,
  });

  if (errors.clients || errors.cars || errors.notes) {
    errors.activity = [errors.clients, errors.cars, errors.notes]
      .filter(Boolean)
      .join("; ");
  }

  return {
    period,
    attention,
    todaysWork,
    financial,
    business,
    employeeWorkload,
    recentActivity,
    errors,
  };
}
