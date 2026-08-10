import { getDefaultRouteForRole, parseAppRole } from "@/lib/auth/roles";
import { resolveSafeRedirect } from "@/lib/auth/routes";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve a safe internal post-auth destination for browser flows. */
export async function resolveClientPostAuthRedirect(
  supabase: SupabaseClient,
  redirectTo?: string | null
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const role = parseAppRole(profile?.role as string | undefined);
  const isActive = profile?.is_active !== false && role !== "inactive";

  if (!isActive) {
    return "/access-disabled";
  }

  const fallback = getDefaultRouteForRole(role);
  const candidate = redirectTo?.trim() || fallback;
  return resolveSafeRedirect(role, candidate);
}
