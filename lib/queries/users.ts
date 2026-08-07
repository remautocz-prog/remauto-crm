import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAppRole, type AppRole } from "@/lib/auth/roles";
import type { ManagedUserRow } from "@/lib/auth/types";

export async function listManagedUsers(): Promise<ManagedUserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[users] Failed to list profiles", error);
    throw error;
  }

  const admin = createAdminClient();
  const authUsers = new Map<
    string,
    { email: string | null; last_sign_in_at: string | null; phone: string | null }
  >();

  if (admin) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (!listError && listed?.users) {
      for (const user of listed.users) {
        const metadata = user.user_metadata as Record<string, unknown> | undefined;
        const metadataPhone =
          typeof metadata?.phone === "string" ? metadata.phone : null;
        authUsers.set(user.id, {
          email: user.email ?? null,
          last_sign_in_at: user.last_sign_in_at ?? null,
          phone: user.phone ?? metadataPhone,
        });
      }
    }
  }

  return (data ?? []).map((row) => {
    const authMeta = authUsers.get(String(row.id));
    return {
      id: String(row.id),
      email: authMeta?.email ?? null,
      full_name: (row.full_name as string | null) ?? null,
      phone: authMeta?.phone ?? null,
      role: parseAppRole(row.role as string | null),
      is_active: row.is_active !== false,
      created_at: (row.created_at as string | null) ?? null,
      last_sign_in_at: authMeta?.last_sign_in_at ?? null,
    };
  });
}

export async function countActiveOwners(excludeUserId?: string): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("is_active", true);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getProfileRole(userId: string): Promise<AppRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.is_active === false) return "inactive";
  return parseAppRole(data.role as string | null);
}
