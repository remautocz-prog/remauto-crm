import { createClient } from "@/lib/supabase/server";
import { getClientLastActivityAt } from "@/lib/clients/activity";
import type { Car } from "@/lib/types/cars";
import type {
  Client,
  ClientRelatedCounts,
  ClientsListParams,
} from "@/lib/types/clients";
import type { DetailingOrder, DocumentTask, FinanceTransaction } from "@/lib/types/database";

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: Number(row.id),
    full_name: String(row.full_name ?? ""),
    company: (row.company as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    client_type: (row.client_type as Client["client_type"]) ?? "individual",
    city: (row.city as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    preferred_language: (row.preferred_language as Client["preferred_language"]) ?? null,
    tax_id: (row.tax_id as string | null) ?? null,
    vat_id: (row.vat_id as string | null) ?? null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export async function getClients(params: ClientsListParams = {}) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*");

  if (!params.show_archived) {
    query = query.eq("is_active", true);
  }

  if (params.client_type && params.client_type !== "all") {
    query = query.eq("client_type", params.client_type);
  }

  if (params.country && params.country !== "all") {
    query = query.eq("country", params.country);
  }

  if (params.preferred_language && params.preferred_language !== "all") {
    query = query.eq("preferred_language", params.preferred_language);
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    query = query.or(
      `full_name.ilike.${term},company.ilike.${term},phone.ilike.${term},email.ilike.${term},tax_id.ilike.${term}`
    );
  }

  switch (params.sort) {
    case "name":
      query = query.order("full_name", { ascending: true });
      break;
    case "company":
      query = query.order("company", { ascending: true, nullsFirst: false });
      break;
    case "last_activity":
      query = query.order("updated_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  let clients = (data ?? []).map((row) => mapClient(row as Record<string, unknown>));

  if (params.sort === "last_activity") {
    const [carsResult, docsResult, detailingResult] = await Promise.all([
      supabase.from("cars").select("id, client_id, owner_client_id, updated_at, created_at"),
      supabase.from("document_tasks").select("id, client_id, created_at, updated_at"),
      supabase.from("detailing_orders").select("id, client_id, created_at, updated_at"),
    ]);

    const cars = (carsResult.data ?? []) as Array<{
      client_id: number | null;
      owner_client_id: number | null;
      updated_at: string;
      created_at: string;
    }>;
    const docs = (docsResult.data ?? []) as DocumentTask[];
    const detailing = (detailingResult.data ?? []) as DetailingOrder[];

    clients = clients
      .map((client) => {
        const relatedCars = cars.filter(
          (car) => car.client_id === client.id || car.owner_client_id === client.id
        ) as Car[];
        const relatedDocs = docs.filter((task) => task.client_id === client.id);
        const relatedDetailing = detailing.filter((order) => order.client_id === client.id);

        return {
          client,
          lastActivity: getClientLastActivityAt({
            client,
            cars: relatedCars,
            documentTasks: relatedDocs,
            detailingOrders: relatedDetailing,
          }),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      )
      .map((entry) => entry.client);
  }

  return clients;
}

export async function getClientFilterOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("country, preferred_language")
    .eq("is_active", true);

  if (error) throw error;

  const countries = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.country)
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).sort();

  return { countries };
}

export async function getClientById(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapClient(data as Record<string, unknown>);
}

export async function getAllClientsForDuplicateCheck(excludeId?: number) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*").eq("is_active", true);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapClient(row as Record<string, unknown>));
}

export async function getClientRelatedCars(clientId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .or(`client_id.eq.${clientId},owner_client_id.eq.${clientId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Car[];
}

export async function getClientDocumentTasks(clientId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentTask[];
}

export async function getClientDetailingOrders(clientId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DetailingOrder[];
}

export async function getClientFinanceTransactions(carIds: number[]) {
  if (carIds.length === 0) return [] as FinanceTransaction[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .in("car_id", carIds)
    .order("transaction_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceTransaction[];
}

export async function getClientRelatedCounts(clientId: number): Promise<ClientRelatedCounts> {
  const supabase = await createClient();

  const [buyerCars, ownerCars, docs, detailing, carsForFinance] = await Promise.all([
    supabase.from("cars").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase
      .from("cars")
      .select("id", { count: "exact", head: true })
      .eq("owner_client_id", clientId),
    supabase
      .from("document_tasks")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("detailing_orders")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("cars")
      .select("id")
      .or(`client_id.eq.${clientId},owner_client_id.eq.${clientId}`),
  ]);

  if (buyerCars.error) throw buyerCars.error;
  if (ownerCars.error) throw ownerCars.error;
  if (docs.error) throw docs.error;
  if (detailing.error) throw detailing.error;
  if (carsForFinance.error) throw carsForFinance.error;

  const carIds = (carsForFinance.data ?? []).map((row) => Number(row.id));
  let financeCount = 0;

  if (carIds.length > 0) {
    const finance = await supabase
      .from("finance_transactions")
      .select("id", { count: "exact", head: true })
      .in("car_id", carIds);
    if (finance.error) throw finance.error;
    financeCount = finance.count ?? 0;
  }

  return {
    carsAsBuyer: buyerCars.count ?? 0,
    carsAsOwner: ownerCars.count ?? 0,
    documentTasks: docs.count ?? 0,
    detailingOrders: detailing.count ?? 0,
    financeTransactions: financeCount,
  };
}

export async function getCarExpenseTotalsByCarIds(
  carIds: number[]
): Promise<Record<number, number>> {
  if (carIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("car_expenses")
    .select("car_id, amount")
    .in("car_id", carIds);

  if (error) throw error;

  const totals: Record<number, number> = {};
  for (const row of data ?? []) {
    const carId = Number(row.car_id);
    totals[carId] = (totals[carId] ?? 0) + Number(row.amount ?? 0);
  }
  return totals;
}

export async function getCarsAvailableToLink(clientId: number, limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("id, brand, model, year, vin, registration_number, client_id, owner_client_id")
    .or(`client_id.is.null,client_id.neq.${clientId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
