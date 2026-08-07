import "server-only";

import { requirePermission, getCurrentUserAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import {
  buildExpenseRows,
  buildFinancialTasks,
  buildOutstandingReceivables,
  buildRecentPayments,
  computeAccountantKpis,
  computeIncomeBySource,
  countExpensesAwaitingVerification,
} from "@/lib/finance/accountant-dashboard";
import {
  getPresetDateRange,
  parseDateRangeSearchParams,
  resolveDateRange,
} from "@/lib/date-range/filter";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import {
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import {
  DETAILING_ORDER_SELECT,
  hydrateDetailingOrdersWithServices,
} from "@/lib/detailing/order-services-loader";
import { mapDetailingOrder } from "@/lib/queries/detailing";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountantDashboardData,
  AccountantDashboardSectionErrors,
} from "@/lib/types/accountant-dashboard";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

const TASK_SELECT = `
  *,
  clients:client_id ( id, full_name, company, phone, email, client_type ),
  cars:car_id ( id, brand, model, year, vin, registration_number, client_id ),
  document_task_services ( * )
`;

function mapTaskRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  return mergeTaskRelations(mapDocumentTask(row), row);
}

async function loadDetailingExpenseOrderIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("car_expenses")
    .select("source_detailing_order_id")
    .not("source_detailing_order_id", "is", null);

  if (error) return new Set();

  return new Set(
    (data ?? [])
      .map((row) => row.source_detailing_order_id)
      .filter((value): value is string => Boolean(value))
  );
}

export async function getAccountantDashboardData(input?: {
  from?: string | null;
  to?: string | null;
  preset?: string | null;
  period?: string | null;
}): Promise<AccountantDashboardData> {
  await requirePermission("accounting.dashboard");

  const dateRange = parseDateRangeSearchParams(input ?? {});
  const today = getPragueTodayDateString();
  const todayRange = resolveDateRange(getPresetDateRange("today", today));
  const todayBounds = todayRange.bounds;
  const bounds = dateRange.bounds;
  const errors: AccountantDashboardSectionErrors = {};

  const supabase = await createClient();

  const [
    userAccess,
    carsResult,
    carExpensesResult,
    detailingExpensesResult,
    tasksResult,
    ordersResult,
    expenseOrderIds,
  ] = await Promise.all([
    getCurrentUserAccess(),
    supabase.from("cars").select("*"),
    supabase
      .from("car_expenses")
      .select("id, car_id, category, amount, expense_date, description")
      .order("expense_date", { ascending: false })
      .limit(200),
    supabase
      .from("detailing_expenses")
      .select("id, category, amount, expense_date, description")
      .order("expense_date", { ascending: false })
      .limit(200),
    supabase.from("document_tasks").select(TASK_SELECT).is("archived_at", null),
    supabase
      .from("detailing_orders")
      .select(DETAILING_ORDER_SELECT)
      .is("archived_at", null)
      .neq("status", "cancelled"),
    loadDetailingExpenseOrderIds(),
  ]);

  let cars: Car[] = [];
  let tasks: DocumentTaskWithRelations[] = [];
  let orders: DetailingOrderWithServices[] = [];

  if (carsResult.error) errors.core = true;
  else cars = (carsResult.data ?? []) as Car[];

  if (tasksResult.error) errors.core = true;
  else {
    tasks = (tasksResult.data ?? []).map((row) =>
      mapTaskRow(row as Record<string, unknown>)
    );
  }

  if (ordersResult.error) errors.core = true;
  else {
    try {
      orders = await hydrateDetailingOrdersWithServices(
        (ordersResult.data ?? []).map((row) =>
          mapDetailingOrder(row as Record<string, unknown>)
        )
      );
    } catch {
      errors.core = true;
      orders = [];
    }
  }

  if (carExpensesResult.error || detailingExpensesResult.error) {
    errors.expenses = true;
  }

  const receivables = errors.core
    ? []
    : buildOutstandingReceivables({ tasks, orders, cars, today });

  const awaitingPayment = {
    documents: receivables.filter((row) => row.module === "documents"),
    detailing: receivables.filter((row) => row.module === "detailing"),
    cars: receivables.filter((row) => row.module === "cars"),
  };

  const expensesAwaitingVerification = errors.core
    ? 0
    : countExpensesAwaitingVerification({
        orders,
        detailingExpenseOrderIds: expenseOrderIds,
        cars,
      });

  const financialTasks = errors.core
    ? []
    : buildFinancialTasks({
        tasks,
        orders,
        cars,
        detailingExpenseOrderIds: expenseOrderIds,
        today,
      });

  const incomeBySource =
    errors.core || !bounds.start || !bounds.end
      ? { cars: 0, detailing: 0, documents: 0, total: 0 }
      : computeIncomeBySource({ tasks, cars, orders, bounds });

  const kpis =
    errors.core || !todayBounds.start || !todayBounds.end
      ? {
          incomingToday: 0,
          unpaidCount: 0,
          outstandingReceivables: 0,
          expensesAwaitingVerification: 0,
          financialTasksToday: 0,
        }
      : computeAccountantKpis({
          tasks,
          cars,
          orders,
          receivables,
          expensesAwaitingVerification,
          financialTasks,
          todayBounds,
        });

  const expenseSection =
    errors.expenses || !bounds.start || !bounds.end
      ? {
          periodTotal: 0,
          todayTotal: 0,
          pendingVerificationCount: expensesAwaitingVerification,
          byModule: { cars: 0, detailing: 0, documents: 0 },
          recent: [],
        }
      : {
          ...buildExpenseRows({
            carExpenses: (carExpensesResult.data ?? []) as never,
            detailingExpenses: (detailingExpensesResult.data ?? []) as never,
            tasks,
            bounds,
            today,
          }),
          pendingVerificationCount: expensesAwaitingVerification,
        };

  const recentPayments = errors.core
    ? []
    : buildRecentPayments({ tasks, orders, cars, limit: 20 });

  const quickActions = {
    canManageExpenses: userAccess
      ? hasPermission(userAccess.role, "finance.manage") ||
        hasPermission(userAccess.role, "detailing.expenses.manage")
      : false,
    canViewFinanceCenter: userAccess
      ? hasPermission(userAccess.role, "finance.view")
      : false,
    canViewDocuments: userAccess
      ? hasPermission(userAccess.role, "documents.view")
      : false,
  };

  if (errors.core) errors.receivables = true;

  return {
    dateRange,
    kpis,
    incomeBySource,
    receivables,
    awaitingPayment,
    expenses: expenseSection,
    financialTasks,
    recentPayments,
    quickActions,
    errors,
  };
}
