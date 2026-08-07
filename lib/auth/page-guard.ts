import "server-only";

import { redirect } from "next/navigation";
import {
  getAccessDeniedRedirect,
  getCurrentUserAccess,
  requirePermission,
} from "@/lib/auth/access";
import type { Permission } from "@/lib/auth/permissions";

export async function requirePageAccess(permission: Permission) {
  return requirePermission(permission);
}

export async function requireActiveAccount() {
  const access = await getCurrentUserAccess();
  if (!access) {
    redirect("/login");
  }
  if (!access.isActive) {
    redirect("/access-disabled");
  }
  return access;
}

export async function redirectIfRouteDenied(pathname: string) {
  const access = await requireActiveAccount();
  const { isRouteAllowed } = await import("@/lib/auth/routes");
  if (!isRouteAllowed(access.role, pathname)) {
    redirect(getAccessDeniedRedirect(access));
  }
  return access;
}
