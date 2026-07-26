import { createClient } from "@/lib/supabase/server";
import type { Car, CarExpense, CarsListParams, ClientOption, Profile } from "@/lib/types/cars";

export async function getCars(params: CarsListParams = {}) {
  const supabase = await createClient();
  let query = supabase.from("cars").select("*");

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.business_model && params.business_model !== "all") {
    query = query.eq("business_model", params.business_model);
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    query = query.or(
      `vin.ilike.${term},brand.ilike.${term},model.ilike.${term},registration_number.ilike.${term},stock_number.ilike.${term}`
    );
  }

  switch (params.sort) {
    case "purchase_date":
      query = query.order("purchase_date", { ascending: false, nullsFirst: false });
      break;
    case "price":
      if (params.business_model === "owned") {
        query = query.order("purchase_price", { ascending: false, nullsFirst: false });
      } else {
        query = query.order("sale_price", { ascending: false, nullsFirst: false });
      }
      break;
    case "sale_date":
      query = query.order("sale_date", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Car[];
}

export async function getCarById(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Car;
}

export async function getCarExpenses(carId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("car_expenses")
    .select("*")
    .eq("car_id", carId)
    .order("expense_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CarExpense[];
}

export async function getClientOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ClientOption[];
}

export async function getProfileOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getClientById(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, company")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProfileById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}
