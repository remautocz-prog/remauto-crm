import {
  buildProfitDirectionBars,
  buildProfitTrendSeries,
} from "@/lib/dashboard/owner-chart-metrics";
import {
  getDashboardPeriodBounds,
  type DashboardPeriodBounds,
} from "@/lib/dashboard/period";
import {
  computeCombinedRealizedResult,
  computeDocumentsRealizedProfit,
} from "@/lib/finance/combined-summary";
import {
  buildExpensesByCar,
  computeCarsFinanceSummary,
} from "@/lib/finance/cars-summary";
import {
  buildExpenseBreakdown,
  buildTopProfitSources,
  simplifyFinanceDirectionBars,
  type FinanceDirectionSummary,
  type FinanceExpenseBreakdownRow,
  type FinanceTopSourceRow,
} from "@/lib/finance/finance-center-insights";
import {
  buildPeriodComparison,
  getPreviousPeriodBounds,
  parseFinanceCenterPeriod,
  type FinancePeriod,
  type PeriodComparison,
} from "@/lib/finance/period-comparison";
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
};

export type FinanceCenterSectionErrors = {
  comparisons?: boolean;
  topSources?: boolean;
  expenseBreakdown?: boolean;
  charts?: boolean;
  core?: boolean;
};

export type FinanceCenterData = {
  period: FinancePeriod;
  bounds: DashboardPeriodBounds;
  cars: CarsFinanceSummary;
  detailing: DetailingFinanceSummary;
  documentsWorkload: DocumentWorkloadSummary;
  documentsProfit: number | null;
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

const EMPTY_WORKLOAD: DocumentWorkloadSummary = {
  inProgress: 0,
  dueToday: 0,
  overdue: 0,
  completedThisPeriod: 0,
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

function emptyFinanceCenter(period: FinancePeriod, bounds: DashboardPeriodBounds): FinanceCenterData {
  return {
    period,
    bounds,
    cars: EMPTY_CARS,
    detailing: EMPTY_DETAILING,
    documentsWorkload: EMPTY_WORKLOAD,
    documentsProfit: null,
    combinedRealized: 0,
    comparisons: {
      realizedProfit: null,
      detailingRevenue: null,
      detailingExpenses: null,
      detailingNetResult: null,
    },
    profitTrend: [],
    directionSummary: [],
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
  return {
    orderCount: report.orderCount,
    revenue: report.deliveredRevenue,
    commissions: report.employeeCommissions,
    expenses: report.expenses,
    netResult: report.netResult,
  };
}

async function loadPeriodComparisons(input: {
  period: FinancePeriod;
  today: string;
  cars: Car[];
  expensesByCar: Map<number, number>;
  tasks: DocumentTaskWithRelations[];
  current: {
    combinedRealized: number;
    detailing: DetailingFinanceSummary;
  };
}): Promise<FinanceComparisonMetrics> {
  const previousBounds = getPreviousPeriodBounds(input.period, input.today);
  if (!previousBounds?.start || !previousBounds?.end) {
    return {
      realizedProfit: null,
      detailingRevenue: null,
      detailingExpenses: null,
      detailingNetResult: null,
    };
  }

  const previousCars = computeCarsFinanceSummary({
    cars: input.cars,
    expensesByCar: input.expensesByCar,
    bounds: previousBounds,
  });
  const previousDetailing = await loadDetailingSummary(previousBounds);
  const previousDocumentsProfit = computeDocumentsRealizedProfit(
    input.tasks,
    previousBounds
  );
  const previousCombined = computeCombinedRealizedResult({
    carsRealizedProfit: previousCars.realizedProfit,
    detailingNetResult: previousDetailing.netResult,
    documentsProfit: previousDocumentsProfit,
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
  };
}

export async function getFinanceCenterData(
  periodInput?: string | null
): Promise<FinanceCenterData> {
  const period = parseFinanceCenterPeriod(periodInput);
  const today = getPragueTodayDateString();
  const bounds = getDashboardPeriodBounds(period, today);
  const trendStart = bounds.start ?? addDays(today, -29);
  const errors: FinanceCenterSectionErrors = {};

  if (!bounds.start || !bounds.end) {
    return emptyFinanceCenter(period, bounds);
  }

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
    return { ...emptyFinanceCenter(period, bounds), errors };
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

  const documentsProfitValue = computeDocumentsRealizedProfit(tasks, bounds);
  const documentsProfit =
    documentsProfitValue !== 0 ? documentsProfitValue : null;

  const combinedRealized = computeCombinedRealizedResult({
    carsRealizedProfit: carsSummary.realizedProfit,
    detailingNetResult: detailingSummary.netResult,
    documentsProfit: documentsProfit ?? 0,
  });

  let comparisons: FinanceComparisonMetrics = {
    realizedProfit: null,
    detailingRevenue: null,
    detailingExpenses: null,
    detailingNetResult: null,
  };

  try {
    comparisons = await loadPeriodComparisons({
      period,
      today,
      cars,
      expensesByCar,
      tasks,
      current: { combinedRealized, detailing: detailingSummary },
    });
  } catch {
    errors.comparisons = true;
  }

  let profitTrend: ProfitTrendPoint[] = [];
  let directionSummary: FinanceDirectionSummary[] = [];

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
      const trendDays = Math.max(
        1,
        Math.ceil(
          (new Date(bounds.end).getTime() - new Date(trendStart).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );

      profitTrend = buildProfitTrendSeries({
        today: bounds.end,
        cars,
        expensesByCar,
        detailingOrders: chartOrders,
        detailingExpenses: chartExpensesResult.data ?? [],
        documentTasks: tasks,
        days: Math.min(trendDays, 90),
      });

      const directionBars = buildProfitDirectionBars({
        today: bounds.end,
        cars,
        expensesByCar,
        detailingNet: detailingSummary.netResult,
        documentTasks: tasks,
      });

      directionSummary = simplifyFinanceDirectionBars({
        bars: directionBars,
        documentsProfit,
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
    period,
    bounds,
    cars: carsSummary,
    detailing: detailingSummary,
    documentsWorkload,
    documentsProfit,
    combinedRealized,
    comparisons,
    profitTrend,
    directionSummary,
    topProfitSources,
    expenseBreakdown,
    errors,
  };
}
