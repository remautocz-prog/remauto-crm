import { createClient } from "@/lib/supabase/server";
import { handleDetailingQueryError } from "@/lib/detailing/query-utils";
import type {
  DetailingOrder,
  DetailingOrderService,
  DetailingOrderWithServices,
} from "@/lib/types/detailing";

/** Orders only — no PostgREST embed (avoids PGRST200 on detailing_order_services). */
export const DETAILING_ORDER_SELECT = "*";

const ORDER_SERVICE_SELECT = "*";

export function mapDetailingOrderServiceRow(
  row: Record<string, unknown>
): DetailingOrderService {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    service_id: row.service_id != null ? String(row.service_id) : null,
    service_name_snapshot: String(row.service_name_snapshot),
    quantity: Number(row.quantity ?? 1),
    unit_price: row.unit_price != null ? Number(row.unit_price) : null,
    total_price: Number(row.total_price ?? 0),
    notes: (row.notes as string | null) ?? null,
    assigned_employee_id:
      row.assigned_employee_id != null ? String(row.assigned_employee_id) : null,
    employee_name_snapshot: (row.employee_name_snapshot as string | null) ?? null,
    commission_percent_snapshot:
      row.commission_percent_snapshot != null
        ? Number(row.commission_percent_snapshot)
        : null,
    commission_amount: Number(row.commission_amount ?? 0),
    created_at: String(row.created_at),
  };
}

export async function fetchDetailingOrderServicesByOrderIds(
  orderIds: string[]
): Promise<Map<string, DetailingOrderService[]>> {
  const map = new Map<string, DetailingOrderService[]>();
  if (!orderIds.length) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_order_services")
    .select(ORDER_SERVICE_SELECT)
    .in("order_id", orderIds);

  if (error) {
    handleDetailingQueryError("fetchDetailingOrderServicesByOrderIds", error);
  }

  for (const row of data ?? []) {
    const service = mapDetailingOrderServiceRow(row as Record<string, unknown>);
    const existing = map.get(service.order_id) ?? [];
    existing.push(service);
    map.set(service.order_id, existing);
  }

  return map;
}

export function attachDetailingOrderServices(
  orders: DetailingOrder[],
  servicesByOrderId: Map<string, DetailingOrderService[]>
): DetailingOrderWithServices[] {
  return orders.map((order) => ({
    ...order,
    services: servicesByOrderId.get(order.id) ?? [],
  }));
}

export async function hydrateDetailingOrdersWithServices(
  orders: DetailingOrder[]
): Promise<DetailingOrderWithServices[]> {
  const servicesByOrderId = await fetchDetailingOrderServicesByOrderIds(
    orders.map((order) => order.id)
  );
  return attachDetailingOrderServices(orders, servicesByOrderId);
}
