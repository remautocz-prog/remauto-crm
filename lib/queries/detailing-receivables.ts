import "server-only";

import {
  DETAILING_ORDER_SELECT,
  hydrateDetailingOrdersWithServices,
} from "@/lib/detailing/order-services-loader";
import {
  summarizeDetailingReceivables,
  type DetailingReceivablesSummary,
} from "@/lib/detailing/receivables";
import { mapDetailingOrder } from "@/lib/queries/detailing";
import { createClient } from "@/lib/supabase/server";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";

export async function loadActiveDetailingOrdersForReceivables(
  limit = 500
): Promise<{
  orders: DetailingOrderWithServices[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select(DETAILING_ORDER_SELECT)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return { orders: [], error: true };

  try {
    const orders = await hydrateDetailingOrdersWithServices(
      (data ?? []).map((row) => mapDetailingOrder(row as Record<string, unknown>))
    );
    return { orders, error: false };
  } catch {
    return { orders: [], error: true };
  }
}

export async function getDetailingReceivablesSummary(): Promise<{
  summary: DetailingReceivablesSummary;
  error: boolean;
}> {
  const { orders, error } = await loadActiveDetailingOrdersForReceivables();
  return {
    summary: summarizeDetailingReceivables(orders),
    error,
  };
}
