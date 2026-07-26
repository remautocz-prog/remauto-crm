import { createClient } from "@/lib/supabase/server";
import type {
  Car,
  Client,
  DetailingOrder,
  DocumentTask,
  FinanceTransaction,
} from "@/lib/types/database";

export async function getCars() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Car[];
}

export async function getDocumentTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentTask[];
}

export async function getDetailingOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detailing_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DetailingOrder[];
}

export async function getClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getFinanceTransactions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .order("transaction_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceTransaction[];
}
