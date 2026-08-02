import {
  buildProfitDirectionBars,
  buildProfitTrendSeries,
  computeCombinedMonthlyProfit,
} from "@/lib/dashboard/owner-chart-metrics";
import { buildOwnerActivityFeed } from "@/lib/dashboard/owner-activity-feed";
import {
  computeOwnerAttentionItems,
  computeOwnerTopCards,
  isTaskActiveForDeadline,
  isTaskDueToday,
  sortOverdueTasks,
} from "@/lib/dashboard/owner-metrics";
import { EMPTY_DETAILING_DASHBOARD_STATS } from "@/lib/detailing/defaults";
import { hydrateDetailingOrdersWithServices } from "@/lib/detailing/order-services-loader";
import { DETAILING_ORDER_SELECT } from "@/lib/detailing/order-services-loader";
import { safeDetailingQuery } from "@/lib/detailing/query-utils";
import {
  getDetailingAttentionOrders,
  getDetailingDashboardStats,
  getTodayDetailingAppointments,
  getRecentDetailingOrders,
  mapDetailingOrder,
} from "@/lib/queries/detailing";
import { createClient } from "@/lib/supabase/server";
import {
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import type { DashboardPeriod } from "@/lib/dashboard/period";
import type { Car } from "@/lib/types/cars";
import type { Client, ClientNote } from "@/lib/types/clients";
import type {
  OwnerDashboardData,
  OwnerDashboardSectionErrors,
} from "@/lib/types/owner-dashboard";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

const TASK_SELECT = `
  *,
  clients:client_id ( id, full_name, company, phone, email, client_type ),
  cars:car_id ( id, brand, model, year, vin, registration_number, client_id ),
  assignee:assigned_to ( id, full_name ),
  document_task_services ( * )
`;

function mapTaskRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  return mergeTaskRelations(mapDocumentTask(row), row);
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function emptyOwnerDashboard(period: DashboardPeriod): OwnerDashboardData {
  return {
    period,
    topCards: {
      monthlyProfit: 0,
      carsInStock: 0,
      commissionCarsInStock: 0,
      documentsInProgress: 0,
      detailingOrdersToday: 0,
      attentionCount: 0,
    },
    charts: {
      profitTrend: [],
      profitByDirection: [],
    },
    attentionItems: [],
    today: {
      detailingAppointments: [],
      detailingReady: [],
      documentsDueToday: [],
      overdueTasks: [],
    },
    detailing: {
      stats: EMPTY_DETAILING_DASHBOARD_STATS,
    },
    recentActivity: [],
    errors: {},
  };
}

export async function getOwnerDashboardData(
  period: DashboardPeriod = "month"
): Promise<OwnerDashboardData> {
  const supabase = await createClient();
  const today = getPragueTodayDateString();
  const trendStart = addDays(today, -29);
  const errors: OwnerDashboardSectionErrors = {};
  const detailingWarnings: { query: string; message: string }[] = [];

  const [
    documentsResult,
    carsResult,
    expensesResult,
    clientsResult,
    notesResult,
    carExpensesRecentResult,
    chartDetailingDeliveredResult,
    chartDetailingExpensesResult,
  ] = await Promise.allSettled([
    supabase.from("document_tasks").select(TASK_SELECT).is("archived_at", null),
    supabase.from("cars").select("*"),
    supabase.from("car_expenses").select("car_id, amount"),
    supabase.from("clients").select("id, full_name, created_at, updated_at").eq("is_active", true),
    supabase
      .from("client_notes")
      .select("*, author:created_by ( id, full_name )")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("car_expenses")
      .select("id, car_id, category, amount, description, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("detailing_orders")
      .select(DETAILING_ORDER_SELECT)
      .eq("status", "delivered")
      .gte("actual_completion_at", `${trendStart}T00:00:00.000Z`)
      .is("archived_at", null),
    supabase
      .from("detailing_expenses")
      .select("amount, expense_date")
      .gte("expense_date", trendStart)
      .lte("expense_date", today),
  ]);

  let tasks: DocumentTaskWithRelations[] = [];
  if (documentsResult.status === "fulfilled") {
    const { data, error } = documentsResult.value;
    if (error) {
      errors.documents = true;
    } else {
      tasks = (data ?? []).map((row) =>
        mapTaskRow(row as Record<string, unknown>)
      );
    }
  } else {
    errors.documents = true;
  }

  let cars: Car[] = [];
  if (carsResult.status === "fulfilled") {
    const { data, error } = carsResult.value;
    if (error) {
      errors.cars = true;
    } else {
      cars = (data ?? []) as Car[];
    }
  } else {
    errors.cars = true;
  }

  const expensesByCar = new Map<number, number>();
  if (expensesResult.status === "fulfilled") {
    const { data, error } = expensesResult.value;
    if (error) {
      errors.cars = true;
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
    errors.cars = true;
  }

  let clients: Client[] = [];
  if (clientsResult.status === "fulfilled") {
    const { data, error } = clientsResult.value;
    if (error) {
      errors.clients = true;
    } else {
      clients = (data ?? []) as Client[];
    }
  } else {
    errors.clients = true;
  }

  let notes: ClientNote[] = [];
  if (notesResult.status === "fulfilled") {
    const { data, error } = notesResult.value;
    if (error) {
      errors.activity = true;
    } else {
      notes = (data ?? []) as ClientNote[];
    }
  } else {
    errors.activity = true;
  }

  const carExpensesRecent =
    carExpensesRecentResult.status === "fulfilled" &&
    !carExpensesRecentResult.value.error
      ? (carExpensesRecentResult.value.data ?? []).map((row) => ({
          id: Number(row.id),
          car_id: Number(row.car_id),
          category: String(row.category),
          amount: Number(row.amount),
          description: (row.description as string | null) ?? null,
          created_at: String(row.created_at),
        }))
      : [];

  let chartDetailingOrders: DetailingOrderWithServices[] = [];
  let chartDetailingExpenses: {
    amount: number | null;
    expense_date: string | null;
  }[] = [];

  if (chartDetailingDeliveredResult.status === "fulfilled") {
    const { data, error } = chartDetailingDeliveredResult.value;
    if (error) {
      if (!error.message?.includes("does not exist")) {
        errors.charts = true;
      }
    } else {
      try {
        chartDetailingOrders = await hydrateDetailingOrdersWithServices(
          (data ?? []).map((row) =>
            mapDetailingOrder(row as Record<string, unknown>)
          )
        );
      } catch {
        errors.charts = true;
      }
    }
  } else {
    errors.charts = true;
  }

  if (chartDetailingExpensesResult.status === "fulfilled") {
    const { data, error } = chartDetailingExpensesResult.value;
    if (error) {
      if (!error.message?.includes("does not exist")) {
        errors.charts = true;
      }
    } else {
      chartDetailingExpenses = data ?? [];
    }
  } else {
    errors.charts = true;
  }

  const [
    detailingStats,
    todayDetailingAppointments,
    detailingAttentionOrders,
    recentDetailingOrders,
  ] = await Promise.all([
    safeDetailingQuery(
      "getDetailingDashboardStats",
      getDetailingDashboardStats,
      EMPTY_DETAILING_DASHBOARD_STATS,
      detailingWarnings
    ),
    safeDetailingQuery(
      "getTodayDetailingAppointments",
      getTodayDetailingAppointments,
      [],
      detailingWarnings
    ),
    safeDetailingQuery(
      "getDetailingAttentionOrders",
      getDetailingAttentionOrders,
      [],
      detailingWarnings
    ),
    safeDetailingQuery(
      "getRecentDetailingOrders",
      () => getRecentDetailingOrders(15),
      [],
      detailingWarnings
    ),
  ]);

  if (detailingWarnings.length > 0) {
    errors.detailing = true;
  }

  const attentionItems =
    errors.cars && errors.documents && errors.detailing
      ? []
      : computeOwnerAttentionItems({
          cars: errors.cars ? [] : cars,
          tasks: errors.documents ? [] : tasks,
          detailingOrders: errors.detailing
            ? []
            : [...detailingAttentionOrders, ...recentDetailingOrders],
          today,
        });

  const attentionCount = attentionItems.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const monthlyProfit =
    errors.cars || errors.documents || errors.detailing
      ? 0
      : computeCombinedMonthlyProfit({
          cars,
          expensesByCar,
          detailingNet: detailingStats.monthNetResult,
          documentTasks: tasks,
          today,
        });

  const topCards = computeOwnerTopCards({
    monthlyProfit,
    cars: errors.cars ? [] : cars,
    tasks: errors.documents ? [] : tasks,
    detailingOrdersToday: detailingStats.todayAppointments,
    attentionCount,
  });

  let charts = emptyOwnerDashboard(period).charts;
  if (!errors.charts && !errors.cars && !errors.documents) {
    charts = {
      profitTrend: buildProfitTrendSeries({
        today,
        cars,
        expensesByCar,
        detailingOrders: chartDetailingOrders,
        detailingExpenses: chartDetailingExpenses,
        documentTasks: tasks,
      }),
      profitByDirection: buildProfitDirectionBars({
        today,
        cars,
        expensesByCar,
        detailingNet: errors.detailing ? 0 : detailingStats.monthNetResult,
        documentTasks: tasks,
      }),
    };
  } else if (errors.cars || errors.documents || errors.charts) {
    errors.charts = true;
  }

  const documentsDueToday = errors.documents
    ? []
    : tasks
        .filter(
          (task) =>
            !task.archived_at &&
            isTaskActiveForDeadline(task) &&
            isTaskDueToday(task, today)
        )
        .slice(0, 5);

  const overdueTasks = errors.documents
    ? []
    : sortOverdueTasks(tasks, today).slice(0, 5);

  const detailingReady = errors.detailing
    ? []
    : detailingAttentionOrders
        .filter((order) => order.status === "ready")
        .slice(0, 5);

  let recentActivity: OwnerDashboardData["recentActivity"] = [];
  if (!errors.activity && !errors.cars && !errors.documents && !errors.clients) {
    recentActivity = buildOwnerActivityFeed({
      clients,
      cars,
      documentTasks: tasks,
      notes,
      detailingOrders: recentDetailingOrders,
      carExpenses: carExpensesRecent,
      limit: 8,
    });
  } else if (errors.cars || errors.documents || errors.clients) {
    errors.activity = true;
  }

  return {
    period,
    topCards,
    charts,
    attentionItems,
    today: {
      detailingAppointments: todayDetailingAppointments.slice(0, 5),
      detailingReady,
      documentsDueToday,
      overdueTasks,
    },
    detailing: {
      stats: detailingStats,
    },
    recentActivity,
    errors,
  };
}
