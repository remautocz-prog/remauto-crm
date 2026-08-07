import {
  buildProfitTrendSeries,
} from "@/lib/dashboard/owner-chart-metrics";
import type { DashboardPeriodBounds } from "@/lib/dashboard/period";
import {
  computeCombinedRealizedResult,
  getDocumentsFinanceSummary,
  type DocumentsFinanceSummary,
} from "@/lib/finance/combined-summary";
import {
  buildExpensesByCar,
  computeCarsFinanceSummary,
} from "@/lib/finance/cars-summary";
import { mapDetailingFinanceReportToSummary } from "@/lib/finance/detailing-summary";
import {
  buildFinanceBusinessDirectionCards,
  buildFinanceDirectionChartSummary,
  computeCarsRealizedExpensesInPeriod,
  type FinanceBusinessDirectionCards,
} from "@/lib/finance/finance-center-directions";
import {
  buildExpenseBreakdown,
  buildTopProfitSources,
  type FinanceDirectionSummary,
  type FinanceExpenseBreakdownRow,
  type FinanceTopSourceRow,
} from "@/lib/finance/finance-center-insights";
import {
  buildPeriodComparison,
  parseFinanceCenterPeriod,
  type FinancePeriod,
  type PeriodComparison,
} from "@/lib/finance/period-comparison";
import {
  getPreviousComparableRange,
  parseDateRangeSearchParams,
  type DateRangeFilter,
  type ResolvedDateRange,
} from "@/lib/date-range/filter";
import { computeDocumentWorkloadSummary } from "@/lib/documents/summary";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import { hydrateDetailingOrdersWithServices } from "@/lib/detailing/order-services-loader";
import {
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import { getDetailingFinanceReport, mapDetailingOrder } from "@/lib/queries/detailing";
import { createClient } from "@/lib/supabase/server";
import type { Car } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { ProfitTrendPoint } from "@/lib/dashboard/owner-chart-metrics";
import type { CarsFinanceSummary } from "@/lib/finance/cars-summary";
import type { DetailingFinanceSummary } from "@/lib/finance/detailing-summary";
import type { DocumentWorkloadSummary } from "@/lib/documents/summary";

export type FinanceComparisonMetrics = {
  realizedProfit: PeriodComparison | null;
  detailingRevenue: PeriodComparison | null;
  detailingExpenses: PeriodComparison | null;
  detailingNetResult: PeriodComparison | null;
  documentsProfit: PeriodComparison | null;
};

export type FinanceCenterSectionErrors = {
  comparisons?: boolean;
  topSources?: boolean;
  expenseBreakdown?: boolean;
  charts?: boolean;
  core?: boolean;
};

export type FinanceCenterData = {
  dateRange: ResolvedDateRange;
  period: FinancePeriod;
  bounds: DashboardPeriodBounds;
  cars: CarsFinanceSummary;
  detailing: DetailingFinanceSummary;
  documentsWorkload: DocumentWorkloadSummary;
  documents: DocumentsFinanceSummary;
  businessDirections: FinanceBusinessDirectionCards;
  combinedRealized: number;
  comparisons: FinanceComparisonMetrics;
  profitTrend: ProfitTrendPoint[];
  directionSummary: FinanceDirectionSummary[];
  topProfitSources: FinanceTopSourceRow[];
  expenseBreakdown: FinanceExpenseBreakdownRow[];
  errors: FinanceCenterSectionErrors;
};

const TASK_SELECT = `
  *,
  document_task_services ( * )
`;

const EMPTY_CARS: CarsFinanceSummary = {
  realizedProfit: 0,
  projectedProfit: 0,
  soldCount: 0,
  activeCount: 0,
};

const EMPTY_DETAILING: DetailingFinanceSummary = {
  orderCount: 0,
  revenue: 0,
  commissions: 0,
  expenses: 0,
  netResult: 0,
};

const EMPTY_DOCUMENTS: DocumentsFinanceSummary = {
  revenue: 0,
  expenses: 0,
  profit: 0,
  paidRevenue: 0,
  unpaidRevenue: 0,
  completedCount: 0,
  averageOrderValue: 0,
  profitSupported: true,
};

const EMPTY_WORKLOAD: DocumentWorkloadSummary = {
  inProgress: 0,
  dueToday: 0,
  overdue: 0,
  completedThisPeriod: 0,
};

const EMPTY_BUSINESS_DIRECTIONS: FinanceBusinessDirectionCards = {
  cars: { profit: 0, expenses: 0, soldCount: 0 },
  detailing: EMPTY_DETAILING,
  documents: EMPTY_DOCUMENTS,
};

function mapTaskRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  return mergeTaskRelations(mapDocumentTask(row), row);
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function emptyFinanceCenter(dateRange: ResolvedDateRange): FinanceCenterData {
  return {
    dateRange,
    period: "month",
    bounds: dateRange.bounds,
    cars: EMPTY_CARS,
    detailing: EMPTY_DETAILING,
    documentsWorkload: EMPTY_WORKLOAD,
    documents: EMPTY_DOCUMENTS,
    businessDirections: EMPTY_BUSINESS_DIRECTIONS,
    combinedRealized: 0,
    comparisons: {
      realizedProfit: null,
      detailingRevenue: null,
      detailingExpenses: null,
      detailingNetResult: null,
      documentsProfit: null,
    },
    profitTrend: [],
    directionSummary: buildFinanceDirectionChartSummary({
      carsProfit: 0,
      detailingNet: 0,
      documentsProfit: 0,
    }),
    topProfitSources: [],
    expenseBreakdown: [],
    errors: {},
  };
}

async function loadDetailingSummary(bounds: DashboardPeriodBounds) {
  if (!bounds.start || !bounds.end) return EMPTY_DETAILING;
  const report = await getDetailingFinanceReport({
    date_from: bounds.start,
    date_to: bounds.end,
  });
  return mapDetailingFinanceReportToSummary(report);
}

async function loadPeriodComparisons(input: {
  dateRange: DateRangeFilter;
  cars: Car[];
  expensesByCar: Map<number, number>;
  tasks: DocumentTaskWithRelations[];
  current: {
    combinedRealized: number;
    detailing: DetailingFinanceSummary;
    documents: DocumentsFinanceSummary;
  };
}): Promise<FinanceComparisonMetrics> {
  const previousRange = getPreviousComparableRange(input.dateRange);
  if (!previousRange) {
    return {
      realizedProfit: null,
      detailingRevenue: null,
      detailingExpenses: null,
      detailingNetResult: null,
      documentsProfit: null,
    };
  }

  const previousBounds = { start: previousRange.from, end: previousRange.to };

  const previousCars = computeCarsFinanceSummary({
    cars: input.cars,
    expensesByCar: input.expensesByCar,
    bounds: previousBounds,
  });
  const previousDetailing = await loadDetailingSummary(previousBounds);
  const previousDocuments = getDocumentsFinanceSummary({
    tasks: input.tasks,
    bounds: previousBounds,
  });
  const previousCombined = computeCombinedRealizedResult({
    carsRealizedProfit: previousCars.realizedProfit,
    detailingNetResult: previousDetailing.netResult,
    documentsProfit: previousDocuments.profit,
  });

  return {
    realizedProfit: buildPeriodComparison(
      input.current.combinedRealized,
      previousCombined
    ),
    detailingRevenue: buildPeriodComparison(
      input.current.detailing.revenue,
      previousDetailing.revenue
    ),
    detailingExpenses: buildPeriodComparison(
      input.current.detailing.expenses,
      previousDetailing.expenses
    ),
    detailingNetResult: buildPeriodComparison(
      input.current.detailing.netResult,
      previousDetailing.netResult
    ),
    documentsProfit: buildPeriodComparison(
      input.current.documents.profit,
      previousDocuments.profit
    ),
  };
}

export async function getFinanceCenterData(input?: {
  from?: string | null;
  to?: string | null;
  preset?: string | null;
  period?: string | null;
}): Promise<FinanceCenterData> {
  const dateRange = parseDateRangeSearchParams(input ?? {});
  const period = parseFinanceCenterPeriod(input?.period ?? input?.preset);
  const bounds = dateRange.bounds;
  const trendStart = bounds.start ?? dateRange.from;
  const errors: FinanceCenterSectionErrors = {};

  if (!bounds.start || !bounds.end) {
    return emptyFinanceCenter(dateRange);
  }

  const today = getPragueTodayDateString();
  const supabase = await createClient();

  const [carsResult, expensesResult, tasksResult] = await Promise.allSettled([
    supabase.from("cars").select("*"),
    supabase.from("car_expenses").select("car_id, amount, category, expense_date"),
    supabase.from("document_tasks").select(TASK_SELECT).is("archived_at", null),
  ]);

  let cars: Car[] = [];
  let expensesByCar = new Map<number, number>();
  let tasks: DocumentTaskWithRelations[] = [];

  if (carsResult.status === "fulfilled" && !carsResult.value.error) {
    cars = (carsResult.value.data ?? []) as Car[];
  } else {
    errors.core = true;
  }

  if (expensesResult.status === "fulfilled" && !expensesResult.value.error) {
    expensesByCar = buildExpensesByCar(expensesResult.value.data ?? []);
  } else {
    errors.core = true;
  }

  if (tasksResult.status === "fulfilled" && !tasksResult.value.error) {
    tasks = (tasksResult.value.data ?? []).map((row) =>
      mapTaskRow(row as Record<string, unknown>)
    );
  } else {
    errors.core = true;
  }

  if (errors.core) {
    return { ...emptyFinanceCenter(dateRange), errors };
  }

  const carsSummary = computeCarsFinanceSummary({
    cars,
    expensesByCar,
    bounds,
  });

  let detailingSummary = EMPTY_DETAILING;
  try {
    detailingSummary = await loadDetailingSummary(bounds);
  } catch {
    errors.core = true;
  }

  const documentsWorkload = computeDocumentWorkloadSummary({
    tasks,
    today,
    bounds,
  });

  const documentsSummary = getDocumentsFinanceSummary({ tasks, bounds });
  const carsRealizedExpenses = computeCarsRealizedExpensesInPeriod({
    cars,
    expensesByCar,
    bounds,
  });
  const businessDirections = buildFinanceBusinessDirectionCards({
    cars: carsSummary,
    carsRealizedExpenses,
    detailing: detailingSummary,
    documents: documentsSummary,
  });

  const combinedRealized = computeCombinedRealizedResult({
    carsRealizedProfit: carsSummary.realizedProfit,
    detailingNetResult: detailingSummary.netResult,
    documentsProfit: documentsSummary.profit,
  });

  let comparisons: FinanceComparisonMetrics = {
    realizedProfit: null,
    detailingRevenue: null,
    detailingExpenses: null,
    detailingNetResult: null,
    documentsProfit: null,
  };

  try {
    comparisons = await loadPeriodComparisons({
      dateRange,
      cars,
      expensesByCar,
      tasks,
      current: {
        combinedRealized,
        detailing: detailingSummary,
        documents: documentsSummary,
      },
    });
  } catch {
    errors.comparisons = true;
  }

  let profitTrend: ProfitTrendPoint[] = [];
  const directionSummary = buildFinanceDirectionChartSummary({
    carsProfit: businessDirections.cars.profit,
    detailingNet: businessDirections.detailing.netResult,
    documentsProfit: businessDirections.documents.profit,
  });

  try {
    const [chartOrdersResult, chartExpensesResult] = await Promise.all([
      supabase
        .from("detailing_orders")
        .select("*")
        .eq("status", "delivered")
        .gte("actual_completion_at", `${trendStart}T00:00:00.000Z`)
        .lte("actual_completion_at", `${bounds.end}T23:59:59.999Z`)
        .is("archived_at", null),
      supabase
        .from("detailing_expenses")
        .select("amount, expense_date")
        .gte("expense_date", trendStart)
        .lte("expense_date", bounds.end),
    ]);

    if (chartOrdersResult.error || chartExpensesResult.error) {
      errors.charts = true;
    } else {
      const chartOrders = await hydrateDetailingOrdersWithServices(
        (chartOrdersResult.data ?? []).map((row) =>
          mapDetailingOrder(row as Record<string, unknown>)
        )
      );
      profitTrend = buildProfitTrendSeries({
        rangeStart: trendStart,
        rangeEnd: bounds.end,
        cars,
        expensesByCar,
        detailingOrders: chartOrders,
        detailingExpenses: chartExpensesResult.data ?? [],
        documentTasks: tasks,
      });
    }
  } catch {
    errors.charts = true;
  }

  let topProfitSources: FinanceTopSourceRow[] = [];
  try {
    const { data: periodOrders, error: ordersError } = await supabase
      .from("detailing_orders")
      .select("*")
      .eq("status", "delivered")
      .gte("actual_completion_at", `${bounds.start}T00:00:00.000Z`)
      .lte("actual_completion_at", `${bounds.end}T23:59:59.999Z`)
      .is("archived_at", null);

    if (ordersError) throw ordersError;

    const detailingOrders = await hydrateDetailingOrdersWithServices(
      (periodOrders ?? []).map((row) =>
        mapDetailingOrder(row as Record<string, unknown>)
      )
    );

    topProfitSources = buildTopProfitSources({
      cars,
      expensesByCar,
      bounds,
      detailingOrders,
      documentTasks: tasks,
    });
  } catch {
    errors.topSources = true;
  }

  let expenseBreakdown: FinanceExpenseBreakdownRow[] = [];
  try {
    const expenseRows = expensesResult.status === "fulfilled" ? expensesResult.value.data ?? [] : [];
    const vehicleExpenses = expenseRows
      .filter((row) => {
        const date = String(row.expense_date).slice(0, 10);
        return date >= bounds.start! && date <= bounds.end!;
      })
      .map((row) => ({
        category: String(row.category),
        amount: Number(row.amount ?? 0),
      }));

    const { data: detailingExpenseRows, error: detailingExpenseError } = await supabase
      .from("detailing_expenses")
      .select("category, amount, expense_date")
      .gte("expense_date", bounds.start)
      .lte("expense_date", bounds.end);

    if (detailingExpenseError) throw detailingExpenseError;

    expenseBreakdown = buildExpenseBreakdown({
      vehicleExpenses,
      detailingExpenses: (detailingExpenseRows ?? []).map((row) => ({
        category: String(row.category),
        amount: Number(row.amount ?? 0),
      })),
    });
  } catch {
    errors.expenseBreakdown = true;
  }

  return {
    dateRange,
    period,
    bounds,
    cars: carsSummary,
    detailing: detailingSummary,
    documentsWorkload,
    documents: documentsSummary,
    businessDirections,
    combinedRealized,
    comparisons,
    profitTrend,
    directionSummary,
    topProfitSources,
    expenseBreakdown,
    errors,
  };
}
