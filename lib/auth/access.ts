import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import {
  canPermanentlyDelete,
  hasPermission,
  listPermissionsForRole,
  type Permission,
} from "@/lib/auth/permissions";
import {
  getDefaultRouteForRole,
  parseAppRole,
  type AppRole,
} from "@/lib/auth/roles";
import type { UserAccess, UserProfile } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

export const PERMISSION_DENIED_CODE = "permission_denied";

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    full_name: (row.full_name as string | null) ?? null,
    role: parseAppRole(row.role as string | null),
    is_active: row.is_active !== false,
    created_at: (row.created_at as string | null) ?? null,
  };
}

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] Failed to load profile", error);
    return null;
  }

  if (!data) return null;
  return mapProfile(data as Record<string, unknown>);
}

function buildAccess(
  userId: string,
  email: string | null,
  profile: UserProfile
): UserAccess {
  const effectiveRole: AppRole =
    profile.is_active && profile.role !== "inactive"
      ? profile.role
      : "inactive";

  return {
    userId,
    email,
    profile: { ...profile, role: effectiveRole },
    role: effectiveRole,
    isActive: effectiveRole !== "inactive",
    permissions: new Set(listPermissionsForRole(effectiveRole)),
  };
}

export const getCurrentUserAccess = cache(async (): Promise<UserAccess | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await loadProfile(user.id);
  if (!profile) {
    return buildAccess(user.id, user.email ?? null, {
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        user.email?.split("@")[0] ||
        null,
      role: "inactive",
      is_active: false,
      created_at: null,
    });
  }

  return buildAccess(user.id, user.email ?? null, profile);
});

export async function requireAuthenticatedAccess(): Promise<UserAccess> {
  const access = await getCurrentUserAccess();
  if (!access) {
    redirect("/login");
  }
  if (!access.isActive) {
    redirect("/access-disabled");
  }
  return access;
}

export async function requirePermission(
  permission: Permission
): Promise<UserAccess> {
  const access = await requireAuthenticatedAccess();
  if (!hasPermission(access.role, permission)) {
    redirect(getAccessDeniedRedirect(access));
  }
  return access;
}

export async function requirePermanentDeleteAccess(): Promise<UserAccess> {
  const access = await requireAuthenticatedAccess();
  if (!canPermanentlyDelete(access.role)) {
    redirect(getAccessDeniedRedirect(access));
  }
  return access;
}

export function getAccessDeniedRedirect(access: UserAccess): string {
  return `/access-denied?from=${encodeURIComponent(getDefaultRouteForRole(access.role))}`;
}

export function userHasPermission(
  access: UserAccess,
  permission: Permission
): boolean {
  return hasPermission(access.role, permission);
}

export { canPermanentlyDelete, hasPermission };
