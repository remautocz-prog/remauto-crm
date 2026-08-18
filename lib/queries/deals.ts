import { createClient } from "@/lib/supabase/server";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getClientLabelFromSnapshot } from "@/lib/deals/snapshots";
import type {
  DealClientSnapshot,
  DealCompanySnapshot,
  DealVehicleSnapshot,
} from "@/lib/types/deals";
import type {
  Deal,
  DealHandoverDetail,
  DealWithRelations,
  DealsListParams,
  DealDashboardMetrics,
} from "@/lib/types/deals";
import type {
  DealHandoverSide,
  DealPaymentMethod,
  DealPaymentPayer,
  DealPaymentStatus,
  DealStatus,
  DealType,
  DealVehicleSource,
  DealCurrency,
} from "@/lib/constants/deals";

const DEAL_SELECT = `
  *,
  client:client_id ( id, full_name, company, phone, email, client_type ),
  vehicle_a:vehicle_a_id ( id, brand, model, year, vin, registration_number ),
  vehicle_b:vehicle_b_id ( id, brand, model, year, vin, registration_number ),
  assignee:assigned_to ( id, full_name ),
  creator:created_by ( id, full_name )
`;

function parseSnapshot<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object") return fallback;
  return value as T;
}

function mapHandover(row: Record<string, unknown>): DealHandoverDetail {
  return {
    id: String(row.id),
    deal_id: String(row.deal_id),
    vehicle_side: row.vehicle_side as DealHandoverSide,
    handover_datetime: (row.handover_datetime as string | null) ?? null,
    mileage: row.mileage != null ? Number(row.mileage) : null,
    fuel_level: (row.fuel_level as string | null) ?? null,
    key_count: row.key_count != null ? Number(row.key_count) : null,
    documents: Array.isArray(row.documents) ? (row.documents as string[]) : [],
    accessories: (row.accessories as string | null) ?? null,
    visible_damage: (row.visible_damage as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function mapDeal(row: Record<string, unknown>): Deal {
  return {
    id: String(row.id),
    deal_number: String(row.deal_number),
    deal_type: row.deal_type as DealType,
    status: row.status as DealStatus,
    client_id: row.client_id != null ? Number(row.client_id) : null,
    vehicle_a_id: row.vehicle_a_id != null ? Number(row.vehicle_a_id) : null,
    vehicle_b_id: row.vehicle_b_id != null ? Number(row.vehicle_b_id) : null,
    vehicle_a_source: row.vehicle_a_source as DealVehicleSource,
    vehicle_b_source: row.vehicle_b_source as DealVehicleSource,
    vehicle_a_snapshot: parseSnapshot(row.vehicle_a_snapshot, {} as DealVehicleSnapshot),
    vehicle_b_snapshot: parseSnapshot(row.vehicle_b_snapshot, {} as DealVehicleSnapshot),
    client_snapshot: parseSnapshot(row.client_snapshot, {} as DealClientSnapshot),
    company_snapshot: parseSnapshot(row.company_snapshot, {} as DealCompanySnapshot),
    vehicle_a_value: row.vehicle_a_value != null ? Number(row.vehicle_a_value) : null,
    vehicle_b_value: row.vehicle_b_value != null ? Number(row.vehicle_b_value) : null,
    additional_payment: row.additional_payment != null ? Number(row.additional_payment) : null,
    additional_payment_words: (row.additional_payment_words as string | null) ?? null,
    currency: row.currency as DealCurrency,
    additional_payment_payer: (row.additional_payment_payer as DealPaymentPayer | null) ?? null,
    payment_method: (row.payment_method as DealPaymentMethod | null) ?? null,
    payment_account: (row.payment_account as string | null) ?? null,
    payment_due_date: (row.payment_due_date as string | null) ?? null,
    payment_paid_at: (row.payment_paid_at as string | null) ?? null,
    payment_status: row.payment_status as DealPaymentStatus,
    custom_payment_method: (row.custom_payment_method as string | null) ?? null,
    signing_place: (row.signing_place as string | null) ?? null,
    signing_date: (row.signing_date as string | null) ?? null,
    vehicle_a_known_defects: (row.vehicle_a_known_defects as string | null) ?? null,
    vehicle_b_known_defects: (row.vehicle_b_known_defects as string | null) ?? null,
    legal_defects_notes: (row.legal_defects_notes as string | null) ?? null,
    service_budget: row.service_budget != null ? Number(row.service_budget) : null,
    additional_terms: (row.additional_terms as string | null) ?? null,
    handover_date: (row.handover_date as string | null) ?? null,
    handover_time: (row.handover_time as string | null) ?? null,
    handover_place: (row.handover_place as string | null) ?? null,
    handover_notes: (row.handover_notes as string | null) ?? null,
    cancelled_reason: (row.cancelled_reason as string | null) ?? null,
    signed_at: (row.signed_at as string | null) ?? null,
    assigned_to: (row.assigned_to as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

function mergeDealRelations(deal: Deal, row: Record<string, unknown>): DealWithRelations {
  return {
    ...deal,
    client: (row.client as DealWithRelations["client"]) ?? null,
    vehicle_a: (row.vehicle_a as DealWithRelations["vehicle_a"]) ?? null,
    vehicle_b: (row.vehicle_b as DealWithRelations["vehicle_b"]) ?? null,
    assignee: (row.assignee as DealWithRelations["assignee"]) ?? null,
    creator: (row.creator as DealWithRelations["creator"]) ?? null,
  };
}

function matchesSearch(deal: DealWithRelations, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;

  if (deal.deal_number.toLowerCase().includes(term)) return true;

  const clientName = deal.client
    ? getClientDisplayName({
        full_name: deal.client.full_name,
        company: deal.client.company,
        client_type: (deal.client.client_type as "individual" | "company") ?? "individual",
      }).toLowerCase()
    : getClientLabelFromSnapshot(deal.client_snapshot).toLowerCase();
  if (clientName.includes(term)) return true;

  if (deal.client?.company?.toLowerCase().includes(term)) return true;
  if (deal.client?.phone?.toLowerCase().includes(term)) return true;
  if (deal.client_snapshot.phone?.toLowerCase().includes(term)) return true;

  const vinA = deal.vehicle_a?.vin ?? deal.vehicle_a_snapshot.vin;
  const vinB = deal.vehicle_b?.vin ?? deal.vehicle_b_snapshot.vin;
  if (vinA?.toLowerCase().includes(term)) return true;
  if (vinB?.toLowerCase().includes(term)) return true;

  const plateA = deal.vehicle_a?.registration_number ?? deal.vehicle_a_snapshot.registration_plate;
  const plateB = deal.vehicle_b?.registration_number ?? deal.vehicle_b_snapshot.registration_plate;
  if (plateA?.toLowerCase().includes(term)) return true;
  if (plateB?.toLowerCase().includes(term)) return true;

  return false;
}

function applyDashboardFilter(deals: DealWithRelations[], filter?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  switch (filter) {
    case "active":
      return deals.filter(
        (deal) =>
          !deal.archived_at &&
          !["cancelled", "completed", "archived"].includes(deal.status)
      );
    case "unsigned_prepared":
      return deals.filter((deal) => !deal.archived_at && deal.status === "prepared");
    case "awaiting_payment":
      return deals.filter(
        (deal) =>
          !deal.archived_at &&
          ["unpaid", "partially_paid"].includes(deal.payment_status)
      );
    case "overdue":
      return deals.filter(
        (deal) =>
          !deal.archived_at &&
          (deal.payment_status === "overdue" ||
            (deal.payment_due_date &&
              deal.payment_due_date < today &&
              !["paid", "not_applicable"].includes(deal.payment_status)))
      );
    case "handovers_today":
      return deals.filter(
        (deal) => !deal.archived_at && deal.handover_date === today
      );
    case "completed_month":
      return deals.filter(
        (deal) =>
          deal.status === "completed" &&
          deal.updated_at.slice(0, 10) >= monthStart
      );
    default:
      return deals;
  }
}

export async function getDeals(params: DealsListParams = {}) {
  const supabase = await createClient();
  let query = supabase.from("deals").select(DEAL_SELECT).order("created_at", { ascending: false });

  if (params.segment === "archived") {
    query = query.not("archived_at", "is", null);
  } else if (params.archived) {
    // Legacy include-archived toggle: show all deals.
  } else {
    query = query.is("archived_at", null);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.payment_status) {
    query = query.eq("payment_status", params.payment_status);
  }
  if (params.payer) {
    query = query.eq("additional_payment_payer", params.payer);
  }
  if (params.assigned_to) {
    query = query.eq("assigned_to", params.assigned_to);
  }
  if (params.date_from) {
    query = query.gte("signing_date", params.date_from);
  }
  if (params.date_to) {
    query = query.lte("signing_date", params.date_to);
  }

  const { data, error } = await query;
  if (error) throw error;

  let deals = (data ?? []).map((row) =>
    mergeDealRelations(mapDeal(row as Record<string, unknown>), row as Record<string, unknown>)
  );

  if (params.q) {
    deals = deals.filter((deal) => matchesSearch(deal, params.q!));
  }

  if (params.filter) {
    deals = applyDashboardFilter(deals, params.filter);
  }

  return deals;
}

export async function getDealById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const deal = mergeDealRelations(
    mapDeal(data as Record<string, unknown>),
    data as Record<string, unknown>
  );

  const { data: handoverRows, error: handoverError } = await supabase
    .from("deal_handover_details")
    .select("*")
    .eq("deal_id", id);

  if (handoverError) throw handoverError;

  return {
    ...deal,
    handover_details: (handoverRows ?? []).map((row) =>
      mapHandover(row as Record<string, unknown>)
    ),
  };
}

export async function getDealsByClientId(clientId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("client_id", clientId)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mergeDealRelations(mapDeal(row as Record<string, unknown>), row as Record<string, unknown>)
  );
}

export async function getDealsByVehicleId(vehicleId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .or(`vehicle_a_id.eq.${vehicleId},vehicle_b_id.eq.${vehicleId}`)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mergeDealRelations(mapDeal(row as Record<string, unknown>), row as Record<string, unknown>)
  );
}

export async function getDealDashboardMetrics(): Promise<DealDashboardMetrics> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const { data, error } = await supabase
    .from("deals")
    .select("status, payment_status, payment_due_date, handover_date, archived_at, updated_at")
    .is("archived_at", null);

  if (error) throw error;

  const rows = data ?? [];
  return {
    activeDeals: rows.filter(
      (row) => !["cancelled", "completed", "archived"].includes(String(row.status))
    ).length,
    unsignedPreparedDeals: rows.filter((row) => row.status === "prepared").length,
    awaitingPayment: rows.filter((row) =>
      ["unpaid", "partially_paid"].includes(String(row.payment_status))
    ).length,
    overduePayments: rows.filter((row) => {
      const due = row.payment_due_date as string | null;
      return (
        due &&
        due < today &&
        !["paid", "not_applicable"].includes(String(row.payment_status))
      );
    }).length,
    handoversToday: rows.filter((row) => row.handover_date === today).length,
    completedThisMonth: rows.filter(
      (row) =>
        row.status === "completed" &&
        String(row.updated_at).slice(0, 10) >= monthStart
    ).length,
  };
}

export async function allocateDealNumber(dealType: DealType) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("next_deal_number_for_deal_type", {
    p_deal_type: dealType,
  });

  if (error) throw error;
  return String(data);
}
