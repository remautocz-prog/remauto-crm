import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_DETAILING_STATUSES,
  CAR_STATUS_IN_STOCK,
  CAR_STATUS_SOLD,
  FINANCE_TYPE_EXPENSE,
  FINANCE_TYPE_INCOME,
  OPEN_DOCUMENT_TASK_STATUSES,
} from "@/lib/constants/status";
import type { DashboardStats } from "@/lib/types/database";

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { start, end } = getMonthBounds();

  const [
    totalCarsResult,
    carsInStockResult,
    carsSoldResult,
    documentTasksResult,
    detailingResult,
    incomeResult,
    expenseResult,
  ] = await Promise.all([
    supabase.from("cars").select("id", { count: "exact", head: true }),
    supabase
      .from("cars")
      .select("id", { count: "exact", head: true })
      .eq("status", CAR_STATUS_IN_STOCK),
    supabase
      .from("cars")
      .select("id", { count: "exact", head: true })
      .eq("status", CAR_STATUS_SOLD),
    supabase
      .from("document_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", [...OPEN_DOCUMENT_TASK_STATUSES]),
    supabase
      .from("detailing_orders")
      .select("id", { count: "exact", head: true })
      .in("status", [...ACTIVE_DETAILING_STATUSES]),
    supabase
      .from("finance_transactions")
      .select("amount")
      .eq("type", FINANCE_TYPE_INCOME)
      .gte("transaction_date", start)
      .lte("transaction_date", end),
    supabase
      .from("finance_transactions")
      .select("amount")
      .eq("type", FINANCE_TYPE_EXPENSE)
      .gte("transaction_date", start)
      .lte("transaction_date", end),
  ]);

  if (totalCarsResult.error) throw totalCarsResult.error;
  if (carsInStockResult.error) throw carsInStockResult.error;
  if (carsSoldResult.error) throw carsSoldResult.error;
  if (documentTasksResult.error) throw documentTasksResult.error;
  if (detailingResult.error) throw detailingResult.error;
  if (incomeResult.error) throw incomeResult.error;
  if (expenseResult.error) throw expenseResult.error;

  const totalIncome =
    incomeResult.data?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const totalExpense =
    expenseResult.data?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  return {
    totalCars: totalCarsResult.count ?? 0,
    carsInStock: carsInStockResult.count ?? 0,
    carsSold: carsSoldResult.count ?? 0,
    openDocumentTasks: documentTasksResult.count ?? 0,
    activeDetailingOrders: detailingResult.count ?? 0,
    monthlyProfit: totalIncome - totalExpense,
  };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}
