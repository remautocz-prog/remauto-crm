import {
  buildOwnerAttentionRows,
  summarizeOwnerAttention,
  type OwnerAttentionRow,
  type OwnerAttentionSummary,
} from "@/lib/dashboard/owner-attention";
import { getPragueTodayDateString } from "@/lib/documents/deadline";
import {
  DETAILING_ORDER_SELECT,
  hydrateDetailingOrdersWithServices,
} from "@/lib/detailing/order-services-loader";
import {
  mapDocumentTask,
  mergeTaskRelations,
} from "@/lib/documents/helpers";
import { mapDetailingOrder } from "@/lib/queries/detailing";
import { createClient } from "@/lib/supabase/server";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

const TASK_ATTENTION_SELECT = `
  id,
  status,
  priority,
  due_date,
  deadline,
  created_at,
  updated_at,
  archived_at,
  service_type,
  work_type,
  custom_service_name,
  vehicle_mode,
  vehicle_vin,
  vehicle_plate,
  vehicle_brand,
  vehicle_model,
  vehicle_year,
  car_id,
  clients:client_id ( id, full_name, company, phone, email, client_type ),
  cars:car_id ( id, brand, model, year, vin, registration_number, client_id )
`;

const CAR_ATTENTION_SELECT =
  "id, brand, model, year, status, business_model, sale_price, actual_sale_price, purchase_date, sale_date, registration_number, stock_number, client_id, created_at, updated_at";

export type OwnerAttentionLoadResult = {
  items: OwnerAttentionRow[];
  summary: OwnerAttentionSummary;
  errors: {
    documents?: boolean;
    detailing?: boolean;
    cars?: boolean;
  };
};

function mapTaskRow(row: Record<string, unknown>): DocumentTaskWithRelations {
  return mergeTaskRelations(mapDocumentTask(row), row);
}

async function loadDocumentAttentionTasks(): Promise<{
  tasks: DocumentTaskWithRelations[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select(TASK_ATTENTION_SELECT)
    .is("archived_at", null);

  if (error) {
    return { tasks: [], error: true };
  }

  return {
    tasks: (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>)),
    error: false,
  };
}

async function loadCarAttentionData(): Promise<{
  cars: Car[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select(CAR_ATTENTION_SELECT);

  if (error) {
    return { cars: [], error: true };
  }

  return { cars: (data ?? []) as Car[], error: false };
}

async function loadDetailingAttentionOrders(): Promise<{
  orders: DetailingOrderWithServices[];
  error: boolean;
}> {
  const supabase = await createClient();
  const today = getPragueTodayDateString();

  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .or(
      [
        "status.eq.ready",
        "and(status.eq.delivered,or(payment_status.eq.unpaid,payment_status.eq.partially_paid))",
        `and(status.in.(scheduled,in_progress),expected_completion_at.lt.${today}T00:00:00.000Z)`,
        `and(status.eq.scheduled,appointment_date.lt.${today})`,
        "and(status.eq.delivered,car_id.not.is.null)",
      ].join(",")
    )
    .order("updated_at", { ascending: true })
    .limit(120);

  if (error) {
    return { orders: [], error: true };
  }

  try {
    const orders = await hydrateDetailingOrdersWithServices(
      (data ?? []).map((row) => mapDetailingOrder(row as Record<string, unknown>))
    );
    return { orders, error: false };
  } catch {
    return { orders: [], error: true };
  }
}

async function loadDetailingExpenseOrderIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("car_expenses")
    .select("source_detailing_order_id")
    .not("source_detailing_order_id", "is", null);

  if (error) {
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.source_detailing_order_id)
      .filter((value): value is string => Boolean(value))
  );
}

export async function loadOwnerAttentionData(): Promise<OwnerAttentionLoadResult> {
  const today = getPragueTodayDateString();
  const errors: OwnerAttentionLoadResult["errors"] = {};

  const [documentsResult, carsResult, detailingResult, expenseOrderIds] =
    await Promise.all([
      loadDocumentAttentionTasks(),
      loadCarAttentionData(),
      loadDetailingAttentionOrders(),
      loadDetailingExpenseOrderIds(),
    ]);

  if (documentsResult.error) errors.documents = true;
  if (carsResult.error) errors.cars = true;
  if (detailingResult.error) errors.detailing = true;

  const items = buildOwnerAttentionRows({
    tasks: documentsResult.error ? [] : documentsResult.tasks,
    cars: carsResult.error ? [] : carsResult.cars,
    detailingOrders: detailingResult.error ? [] : detailingResult.orders,
    detailingExpenseOrderIds: expenseOrderIds,
    today,
  });

  return {
    items,
    summary: summarizeOwnerAttention(items),
    errors,
  };
}
