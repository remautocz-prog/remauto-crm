import {
  buildProfitDirectionBars,
  buildProfitTrendSeries,
} from "@/lib/dashboard/owner-chart-metrics";
import { buildOwnerActivityFeed } from "@/lib/dashboard/owner-activity-feed";
import {
  computeOwnerTopCards,
  isTaskActiveForDeadline,
  isTaskDueToday,
  sortOverdueTasks,
} from "@/lib/dashboard/owner-metrics";
import {
  getPreviousComparableRange,
  parseDateRangeSearchParams,
  type ResolvedDateRange,
} from "@/lib/date-range/filter";
import { EMPTY_DETAILING_DASHBOARD_STATS } from "@/lib/detailing/defaults";
import {
  DETAILING_ORDER_SELECT,
  hydrateDetailingOrdersWithServices,
} from "@/lib/detailing/order-services-loader";
import { safeDetailingQuery } from "@/lib/detailing/query-utils";
import {
  buildBusinessDirectionComparisons,
  computeBusinessDirectionsCombinedResult,
  EMPTY_BUSINESS_DIRECTIONS,
  loadBusinessDirectionsForPeriod,
  type BusinessDirectionComparisons,
} from "@/lib/finance/finance-center-directions";
import { getDocumentsFinanceSummary } from "@/lib/finance/documents-summary";
import {
  getDetailingAttentionOrders,
  getDetailingDashboardStats,
  getRecentDetailingOrders,
  getTodayDetailingAppointments,
  mapDetailingOrder,
} from "@/lib/queries/detailing";
import { loadOwnerAttentionData } from "@/lib/queries/owner-attention";
import { getCurrentUserAccess, hasPermission, requirePermission } from "@/lib/auth/access";
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

function resolveDashboardPeriod(dateRange: ResolvedDateRange): DashboardPeriod {
  if (dateRange.preset === "custom") return "month";
  return dateRange.preset;
}

function emptyOwnerDashboard(dateRange: ResolvedDateRange): OwnerDashboardData {
  return {
    dateRange,
    period: resolveDashboardPeriod(dateRange),
    topCards: {
      monthlyProfit: 0,
      documentsProfit: 0,
      carsInStock: 0,
      commissionCarsInStock: 0,
      documentsInProgress: 0,
      detailingOrdersToday: 0,
      attentionCount: 0,
    },
    businessDirections: EMPTY_BUSINESS_DIRECTIONS,
    businessDirectionComparisons: {
      cars: null,
      detailing: null,
      documents: null,
    },
    attention: {
      items: [],
      summary: { critical: 0, high: 0, total: 0 },
      errors: {},
    },
    attentionQuickActions: {
      documentsStatus: false,
      detailingPayment: false,
      detailingStatus: false,
      carsStatus: false,
    },
    charts: {
      profitTrend: [],
      profitByDirection: [],
    },
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

export async function getOwnerDashboardData(input?: {
  from?: string | null;
  to?: string | null;
  preset?: string | null;
  period?: string | null;
}): Promise<OwnerDashboardData> {
  await requirePermission("owner.dashboard");
  const dateRange = parseDateRangeSearchParams(input ?? {});
  const bounds = dateRange.bounds;
  const supabase = await createClient();
  const today = getPragueTodayDateString();
  const trendStart = bounds.start ?? dateRange.from;
  const trendEnd = bounds.end ?? dateRange.to;
  const errors: OwnerDashboardSectionErrors = {};
  const detailingWarnings: { query: string; message: string }[] = [];

  const [userAccess, attention] = await Promise.all([
    getCurrentUserAccess(),
    loadOwnerAttentionData(),
  ]);

  const attentionQuickActions = {
    documentsStatus: userAccess
      ? hasPermission(userAccess.role, "documents.update")
      : false,
    detailingPayment: userAccess
      ? hasPermission(userAccess.role, "detailing.payment.update")
      : false,
    detailingStatus: userAccess
      ? hasPermission(userAccess.role, "detailing.update")
      : false,
    carsStatus: false,
  };

  const attentionCount = attention.summary.total;

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
      .lte("actual_completion_at", `${trendEnd}T23:59:59.999Z`)
      .is("archived_at", null),
    supabase
      .from("detailing_expenses")
      .select("amount, expense_date")
      .gte("expense_date", trendStart)
      .lte("expense_date", trendEnd),
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

  let businessDirections = EMPTY_BUSINESS_DIRECTIONS;
  let businessDirectionComparisons: BusinessDirectionComparisons = {
    cars: null,
    detailing: null,
    documents: null,
  };
  let periodDetailingNet = 0;

  if (bounds.start && bounds.end && !errors.cars && !errors.documents) {
    try {
      businessDirections = await loadBusinessDirectionsForPeriod({
        bounds,
        cars,
        expensesByCar,
        tasks,
      });
      periodDetailingNet = businessDirections.detailing.netResult;

      const previousRange = getPreviousComparableRange(dateRange);
      if (previousRange) {
        const previousDirections = await loadBusinessDirectionsForPeriod({
          bounds: { start: previousRange.from, end: previousRange.to },
          cars,
          expensesByCar,
          tasks,
        });
        businessDirectionComparisons = buildBusinessDirectionComparisons({
          current: businessDirections,
          previous: previousDirections,
        });
      }
    } catch {
      errors.detailing = true;
      businessDirections = EMPTY_BUSINESS_DIRECTIONS;
    }
  } else if (errors.detailing) {
    businessDirections = EMPTY_BUSINESS_DIRECTIONS;
  }

  const monthlyProfit =
    errors.cars || errors.documents || !bounds.start || !bounds.end
      ? 0
      : computeBusinessDirectionsCombinedResult(businessDirections);

  const documentsProfit =
    errors.documents || !bounds.start || !bounds.end
      ? 0
      : getDocumentsFinanceSummary({ tasks, bounds }).profit;

  const topCards = computeOwnerTopCards({
    monthlyProfit,
    documentsProfit,
    cars: errors.cars ? [] : cars,
    tasks: errors.documents ? [] : tasks,
    detailingOrdersToday: detailingStats.todayAppointments,
    attentionCount,
  });

  let charts = emptyOwnerDashboard(dateRange).charts;
  if (!errors.charts && !errors.cars && !errors.documents && bounds.start && bounds.end) {
    charts = {
      profitTrend: buildProfitTrendSeries({
        rangeStart: trendStart,
        rangeEnd: trendEnd,
        cars,
        expensesByCar,
        detailingOrders: chartDetailingOrders,
        detailingExpenses: chartDetailingExpenses,
        documentTasks: tasks,
      }),
      profitByDirection: buildProfitDirectionBars({
        bounds,
        cars,
        expensesByCar,
        detailingNet: errors.detailing ? 0 : periodDetailingNet,
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
      bounds,
      limit: 8,
    });
  } else if (errors.cars || errors.documents || errors.clients) {
    errors.activity = true;
  }

  return {
    dateRange,
    period: resolveDashboardPeriod(dateRange),
    topCards,
    businessDirections,
    businessDirectionComparisons,
    attention,
    attentionQuickActions,
    charts,
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
