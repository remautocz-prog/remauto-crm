import { createClient } from "@/lib/supabase/server";
import type { Client, DocumentTask, FinanceTransaction } from "@/lib/types/database";

export { getDetailingOrders } from "@/lib/queries/detailing";

export async function getDocumentTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentTask[];
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
