import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_DETAILING_ORDER_STATUSES,
  type DetailingOrderStatus,
  type DetailingPaymentStatus,
} from "@/lib/constants/detailing";
import { handleDetailingQueryError, logDetailingQueryError } from "@/lib/detailing/query-utils";
import { DETAILING_SERVICE_SELECT } from "@/lib/detailing/service-catalog";
import {
  DETAILING_ORDER_SELECT,
  hydrateDetailingOrdersWithServices,
} from "@/lib/detailing/order-services-loader";
import { roundMoney } from "@/lib/detailing/pricing";
import {
  aggregateEmployeeCommissionsFromOrders,
  sumDeliveredOrderCommissions,
  toEmployeeSummaryRows,
} from "@/lib/detailing/finance-aggregation";
import { hasServiceLevelAssignments } from "@/lib/detailing/commission";
import type {
  DetailingDashboardStats,
  DetailingEmployeeMonthStats,
  DetailingEmployeeSettings,
  DetailingEmployeeWithProfile,
  DetailingExpense,
  DetailingExpenseMonthSummary,
  DetailingFinanceReport,
  DetailingOrder,
  DetailingOrderWithServices,
  DetailingService,
} from "@/lib/types/detailing";

export type DetailingOrdersListParams = {
  q?: string;
  status?: string;
  payment_status?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  include_archived?: boolean;
};

async function mapOrderRowsWithServices(
  rows: Record<string, unknown>[]
): Promise<DetailingOrderWithServices[]> {
  const orders = rows.map((row) => mapDetailingOrder(row));
  return hydrateDetailingOrdersWithServices(orders);
}

function mapService(row: Record<string, unknown>): DetailingService {
  return {
    id: String(row.id),
    category: row.category as DetailingService["category"],
    name_cs: String(row.name_cs ?? ""),
    name_ru: String(row.name_ru ?? ""),
    description_cs: (row.description_cs as string | null) ?? null,
    description_ru: (row.description_ru as string | null) ?? null,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    max_price: row.max_price != null ? Number(row.max_price) : null,
    price_type: row.price_type as DetailingService["price_type"],
    unit: (row.unit as string | null) ?? null,
    active: Boolean(row.active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function mapDetailingOrder(row: Record<string, unknown>): DetailingOrder {
  return {
    id: String(row.id),
    order_number: String(row.order_number),
    customer_first_name: (row.customer_first_name as string | null) ?? null,
    customer_last_name: (row.customer_last_name as string | null) ?? null,
    customer_phone: (row.customer_phone as string | null) ?? null,
    vehicle_make_model: String(row.vehicle_make_model),
    registration_number: String(row.registration_number),
    vehicle_size: row.vehicle_size as DetailingOrder["vehicle_size"],
    surcharge_percent_snapshot: Number(row.surcharge_percent_snapshot ?? 0),
    appointment_date: String(row.appointment_date),
    appointment_time: String(row.appointment_time).slice(0, 5),
    expected_completion_at: (row.expected_completion_at as string | null) ?? null,
    actual_completion_at: (row.actual_completion_at as string | null) ?? null,
    status: row.status as DetailingOrderStatus,
    notes: (row.notes as string | null) ?? null,
    assigned_employee_id:
      row.assigned_employee_id != null ? String(row.assigned_employee_id) : null,
    employee_name_snapshot: (row.employee_name_snapshot as string | null) ?? null,
    employee_commission_percent_snapshot:
      row.employee_commission_percent_snapshot != null
        ? Number(row.employee_commission_percent_snapshot)
        : null,
    employee_commission_amount:
      row.employee_commission_amount != null
        ? Number(row.employee_commission_amount)
        : null,
    payment_method: (row.payment_method as DetailingOrder["payment_method"]) ?? null,
    services_subtotal: Number(row.services_subtotal ?? 0),
    vehicle_surcharge_amount: Number(row.vehicle_surcharge_amount ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    final_price: Number(row.final_price ?? 0),
    deposit_amount: Number(row.deposit_amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    remaining_amount: Number(row.remaining_amount ?? 0),
    payment_status: row.payment_status as DetailingPaymentStatus,
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export async function allocateDetailingOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_detailing_order_number");
  if (error) handleDetailingQueryError("allocateDetailingOrderNumber", error);
  return String(data);
}

export async function getDetailingServices(includeInactive = false) {
  const supabase = await createClient();
  let query = supabase
    .from("detailing_services")
    .select(DETAILING_SERVICE_SELECT)
    .order("sort_order", { ascending: true })
    .order("name_cs", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  console.info("[detailing-services]", {
    query: "getDetailingServices",
    includeInactive,
    rowCount: data?.length ?? 0,
    error: error
      ? {
          code: error.code ?? null,
          message: error.message ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }
      : null,
  });

  if (error) {
    logDetailingQueryError("getDetailingServices", error);
    handleDetailingQueryError("getDetailingServices", error);
  }

  return (data ?? []).map((row) => mapService(row as Record<string, unknown>));
}

export async function getDetailingServiceById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_services")
    .select(DETAILING_SERVICE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) handleDetailingQueryError("getDetailingServiceById", error);
  return data ? mapService(data as Record<string, unknown>) : null;
}

export async function getDetailingOrders(params: DetailingOrdersListParams = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (!params.include_archived) {
    query = query.is("archived_at", null);
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.payment_status && params.payment_status !== "all") {
    query = query.eq("payment_status", params.payment_status);
  }
  if (params.employee_id && params.employee_id !== "all") {
    query = query.eq("assigned_employee_id", params.employee_id);
  }
  if (params.date_from) {
    query = query.gte("appointment_date", params.date_from);
  }
  if (params.date_to) {
    query = query.lte("appointment_date", params.date_to);
  }

  const { data, error } = await query;
  if (error) handleDetailingQueryError("getDetailingOrders", error);

  let orders = await mapOrderRowsWithServices((data ?? []) as Record<string, unknown>[]);

  if (params.q?.trim()) {
    const term = params.q.trim().toLowerCase();
    orders = orders.filter((order) => {
      const haystack = [
        order.order_number,
        order.customer_first_name,
        order.customer_last_name,
        order.customer_phone,
        order.registration_number,
        order.vehicle_make_model,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  return orders;
}

export async function getDetailingOrderById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) handleDetailingQueryError("getDetailingOrderById", error);
  if (!data) return null;
  const [order] = await mapOrderRowsWithServices([data as Record<string, unknown>]);
  return order ?? null;
}

export async function getDetailingEmployees(includeInactive = false) {
  const supabase = await createClient();
  let query = supabase
    .from("detailing_employee_settings")
    .select("*, profile:profiles!profile_id ( id, full_name )")
    .order("display_name", { ascending: true, nullsFirst: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) handleDetailingQueryError("getDetailingEmployees", error);

  return (data ?? []).map((row) => {
    const settings = row as Record<string, unknown>;
    return {
      id: String(settings.id),
      profile_id: String(settings.profile_id),
      active: Boolean(settings.active),
      commission_percent: Number(settings.commission_percent ?? 35),
      display_name: (settings.display_name as string | null) ?? null,
      created_at: String(settings.created_at),
      updated_at: String(settings.updated_at ?? settings.created_at),
      profile: (settings.profile as DetailingEmployeeWithProfile["profile"]) ?? null,
    } satisfies DetailingEmployeeWithProfile;
  });
}

export async function getDetailingEmployeeByProfileId(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_employee_settings")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) handleDetailingQueryError("getDetailingEmployeeByProfileId", error);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    active: Boolean(row.active),
    commission_percent: Number(row.commission_percent ?? 35),
    display_name: (row.display_name as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  } satisfies DetailingEmployeeSettings;
}

export async function getDetailingExpenses(dateFrom?: string, dateTo?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("detailing_expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (dateFrom) query = query.gte("expense_date", dateFrom);
  if (dateTo) query = query.lte("expense_date", dateTo);

  const { data, error } = await query;
  if (error) handleDetailingQueryError("getDetailingExpenses", error);

  return (data ?? []).map((row) => {
    const expense = row as Record<string, unknown>;
    return {
      id: String(expense.id),
      expense_date: String(expense.expense_date),
      category: expense.category as DetailingExpense["category"],
      description: String(expense.description),
      amount: Number(expense.amount ?? 0),
      payment_method: (expense.payment_method as DetailingExpense["payment_method"]) ?? null,
      created_by: expense.created_by != null ? String(expense.created_by) : null,
      created_at: String(expense.created_at),
      updated_at: String(expense.updated_at ?? expense.created_at),
    } satisfies DetailingExpense;
  });
}

function monthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDetailingDashboardStats(): Promise<DetailingDashboardStats> {
  const supabase = await createClient();
  const today = todayIso();
  const month = monthBounds();

  const [todayOrders, inProgress, ready, monthDelivered, monthExpenses] = await Promise.all([
    supabase
      .from("detailing_orders")
      .select("id, final_price, status")
      .eq("appointment_date", today)
      .is("archived_at", null),
    supabase
      .from("detailing_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress")
      .is("archived_at", null),
    supabase
      .from("detailing_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready")
      .is("archived_at", null),
    supabase
      .from("detailing_orders")
      .select("final_price, employee_commission_amount, actual_completion_at, updated_at")
      .eq("status", "delivered")
      .gte("actual_completion_at", `${month.from}T00:00:00.000Z`)
      .lte("actual_completion_at", `${month.to}T23:59:59.999Z`)
      .is("archived_at", null),
    supabase
      .from("detailing_expenses")
      .select("amount")
      .gte("expense_date", month.from)
      .lte("expense_date", month.to),
  ]);

  if (todayOrders.error) {
    handleDetailingQueryError("getDetailingDashboardStats.todayOrders", todayOrders.error);
  }
  if (inProgress.error) {
    handleDetailingQueryError("getDetailingDashboardStats.inProgress", inProgress.error);
  }
  if (ready.error) {
    handleDetailingQueryError("getDetailingDashboardStats.ready", ready.error);
  }
  if (monthDelivered.error) {
    handleDetailingQueryError("getDetailingDashboardStats.monthDelivered", monthDelivered.error);
  }
  if (monthExpenses.error) {
    handleDetailingQueryError("getDetailingDashboardStats.monthExpenses", monthExpenses.error);
  }

  const todayRows = todayOrders.data ?? [];
  const deliveredRows = monthDelivered.data ?? [];
  const expenseRows = monthExpenses.data ?? [];

  const revenueToday = roundMoney(
    todayRows
      .filter((row) => row.status === "delivered")
      .reduce((sum, row) => sum + Number(row.final_price ?? 0), 0)
  );
  const monthRevenue = roundMoney(
    deliveredRows.reduce((sum, row) => sum + Number(row.final_price ?? 0), 0)
  );
  const monthCommissions = roundMoney(
    deliveredRows.reduce(
      (sum, row) => sum + Number(row.employee_commission_amount ?? 0),
      0
    )
  );
  const monthExpenseTotal = roundMoney(
    expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
  );

  return {
    todayAppointments: todayRows.length,
    carsInProgress: inProgress.count ?? 0,
    carsReady: ready.count ?? 0,
    revenueToday,
    monthDeliveredOrders: deliveredRows.length,
    monthRevenue,
    monthCommissions,
    monthExpenses: monthExpenseTotal,
    monthNetResult: roundMoney(monthRevenue - monthCommissions - monthExpenseTotal),
  };
}

export async function getTodayDetailingAppointments() {
  const supabase = await createClient();
  const today = todayIso();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .eq("appointment_date", today)
    .in("status", [...ACTIVE_DETAILING_ORDER_STATUSES, "delivered"])
    .is("archived_at", null)
    .order("appointment_time", { ascending: true });
  if (error) handleDetailingQueryError("getTodayDetailingAppointments", error);
  return mapOrderRowsWithServices((data ?? []) as Record<string, unknown>[]);
}

export async function getRecentDetailingOrders(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) handleDetailingQueryError("getRecentDetailingOrders", error);
  return mapOrderRowsWithServices((data ?? []) as Record<string, unknown>[]);
}

export async function getDetailingHasOrders(): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("detailing_orders")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .limit(1);
  if (error) handleDetailingQueryError("getDetailingHasOrders", error);
  return (count ?? 0) > 0;
}

export async function getDetailingEmployeeMonthStats(): Promise<
  Map<string, DetailingEmployeeMonthStats>
> {
  const supabase = await createClient();
  const month = monthBounds();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .eq("status", "delivered")
    .gte("actual_completion_at", `${month.from}T00:00:00.000Z`)
    .lte("actual_completion_at", `${month.to}T23:59:59.999Z`)
    .is("archived_at", null);
  if (error) handleDetailingQueryError("getDetailingEmployeeMonthStats", error);

  const orders = await mapOrderRowsWithServices((data ?? []) as Record<string, unknown>[]);
  const aggregates = aggregateEmployeeCommissionsFromOrders(orders);
  const map = new Map<string, DetailingEmployeeMonthStats>();

  for (const [key, entry] of aggregates.entries()) {
    map.set(key, {
      profileId: key,
      assignedServices: entry.assignedServices,
      deliveredOrders: entry.deliveredOrderIds.size,
      revenueGenerated: entry.revenueGenerated,
      commissionPayable: entry.commissionPayable,
    });
  }

  return map;
}

export async function getDetailingExpenseMonthSummary(): Promise<DetailingExpenseMonthSummary> {
  const supabase = await createClient();
  const month = monthBounds();
  const { data, error } = await supabase
    .from("detailing_expenses")
    .select("category, amount")
    .gte("expense_date", month.from)
    .lte("expense_date", month.to);
  if (error) handleDetailingQueryError("getDetailingExpenseMonthSummary", error);

  const rows = data ?? [];
  const categoryTotals = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const amount = Number(row.amount ?? 0);
    total = roundMoney(total + amount);
    const cat = String(row.category);
    categoryTotals.set(cat, roundMoney((categoryTotals.get(cat) ?? 0) + amount));
  }

  let largestCategory: DetailingExpenseMonthSummary["largestCategory"] = null;
  let largestCategoryAmount = 0;
  for (const [category, amount] of categoryTotals.entries()) {
    if (amount > largestCategoryAmount) {
      largestCategory = category as DetailingExpenseMonthSummary["largestCategory"];
      largestCategoryAmount = amount;
    }
  }

  return {
    total,
    count: rows.length,
    largestCategory,
    largestCategoryAmount,
  };
}

export async function getUpcomingDetailingAppointments(limit = 10) {
  const supabase = await createClient();
  const today = todayIso();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .gte("appointment_date", today)
    .in("status", [...ACTIVE_DETAILING_ORDER_STATUSES])
    .is("archived_at", null)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })
    .limit(limit);
  if (error) handleDetailingQueryError("getUpcomingDetailingAppointments", error);
  return mapOrderRowsWithServices((data ?? []) as Record<string, unknown>[]);
}

export async function getDetailingAttentionOrders() {
  const supabase = await createClient();
  const today = todayIso();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .is("archived_at", null)
    .or(
      `and(status.eq.scheduled,appointment_date.lt.${today}),` +
        `status.eq.ready,` +
        `and(status.eq.delivered,or(payment_status.eq.unpaid,payment_status.eq.partially_paid))`
    )
    .order("appointment_date", { ascending: true })
    .limit(20);
  if (error) handleDetailingQueryError("getDetailingAttentionOrders", error);
  return mapOrderRowsWithServices((data ?? []) as Record<string, unknown>[]);
}

export async function getDetailingFinanceReport(params: {
  date_from: string;
  date_to: string;
  employee_id?: string;
}): Promise<DetailingFinanceReport> {
  const supabase = await createClient();
  let ordersQuery = supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .eq("status", "delivered")
    .gte("actual_completion_at", `${params.date_from}T00:00:00.000Z`)
    .lte("actual_completion_at", `${params.date_to}T23:59:59.999Z`)
    .is("archived_at", null);

  const [ordersResult, expensesResult] = await Promise.all([
    ordersQuery,
    supabase
      .from("detailing_expenses")
      .select("*")
      .gte("expense_date", params.date_from)
      .lte("expense_date", params.date_to),
  ]);

  if (ordersResult.error) {
    handleDetailingQueryError("getDetailingFinanceReport.orders", ordersResult.error);
  }
  if (expensesResult.error) {
    handleDetailingQueryError("getDetailingFinanceReport.expenses", expensesResult.error);
  }

  let orders = await mapOrderRowsWithServices((ordersResult.data ?? []) as Record<string, unknown>[]);

  if (params.employee_id && params.employee_id !== "all") {
    orders = orders.filter((order) =>
      order.services.some((service) => service.assigned_employee_id === params.employee_id) ||
      (!hasServiceLevelAssignments(order.services) &&
        order.assigned_employee_id === params.employee_id)
    );
  }

  const expenses = (expensesResult.data ?? []).map((row) => {
    const expense = row as Record<string, unknown>;
    return {
      category: expense.category as DetailingExpense["category"],
      amount: Number(expense.amount ?? 0),
    };
  });

  const deliveredRevenue = roundMoney(
    orders.reduce((sum, order) => sum + order.final_price, 0)
  );
  const employeeCommissions = sumDeliveredOrderCommissions(orders);
  const expenseTotal = roundMoney(
    expenses.reduce((sum, expense) => sum + expense.amount, 0)
  );

  const employeeSummaries = toEmployeeSummaryRows(aggregateEmployeeCommissionsFromOrders(orders));

  const expensesByCategoryMap = new Map<string, number>();
  for (const expense of expenses) {
    expensesByCategoryMap.set(
      expense.category,
      roundMoney((expensesByCategoryMap.get(expense.category) ?? 0) + expense.amount)
    );
  }

  return {
    orderCount: orders.length,
    deliveredRevenue,
    employeeCommissions,
    expenses: expenseTotal,
    netResult: roundMoney(deliveredRevenue - employeeCommissions - expenseTotal),
    averageOrderValue:
      orders.length > 0 ? roundMoney(deliveredRevenue / orders.length) : 0,
    employeeSummaries,
    expensesByCategory: Array.from(expensesByCategoryMap.entries()).map(
      ([category, amount]) => ({
        category: category as DetailingExpense["category"],
        amount,
      })
    ),
  };
}

import { getProfileOptions } from "@/lib/queries/cars";

export async function getProfileOptionsForDetailingEmployees() {
  return getProfileOptions();
}
