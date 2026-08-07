import "server-only";

import { randomUUID } from "crypto";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/** Client-generated UUID primary key — avoids INSERT … RETURNING SELECT RLS failures. */
export function newEntityUuid(): string {
  return randomUUID();
}

type IdentityInsertResult =
  | { id: number; error: null }
  | { id: null; error: PostgrestError };

/**
 * Insert a row with a bigint identity PK and return the generated id.
 *
 * Only safe when SELECT RLS is role-scoped (any row readable by roles that can
 * insert). Do not use for tables with row-level SELECT policies.
 */
export async function insertIdentityReturningId(
  supabase: SupabaseClient,
  table: "cars" | "clients" | "document_tasks",
  payload: Record<string, unknown>
): Promise<IdentityInsertResult> {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { id: null, error };
  }

  return { id: data.id as number, error: null };
}
