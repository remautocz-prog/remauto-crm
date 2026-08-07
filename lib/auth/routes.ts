import type { Permission } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/roles";
import { getDefaultRouteForRole } from "@/lib/auth/roles";
import { hasPermission } from "@/lib/auth/permissions";

type RouteRule = {
  prefix: string;
  permission: Permission;
  exact?: boolean;
};

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/settings/users", permission: "users.view" },
  { prefix: "/settings/templates", permission: "settings.manage" },
  { prefix: "/admin/dashboard", permission: "admin.dashboard", exact: true },
  { prefix: "/accounting/dashboard", permission: "accounting.dashboard", exact: true },
  { prefix: "/dashboard", permission: "owner.dashboard", exact: true },
  { prefix: "/cars", permission: "cars.view" },
  { prefix: "/clients", permission: "clients.view" },
  { prefix: "/documents", permission: "documents.view" },
  { prefix: "/deals", permission: "deals.view" },
  { prefix: "/detailing/finance", permission: "detailing.finance.view" },
  { prefix: "/detailing/expenses", permission: "detailing.expenses.manage" },
  { prefix: "/detailing/employees", permission: "users.view" },
  { prefix: "/detailing/services", permission: "detailing.view" },
  { prefix: "/detailing", permission: "detailing.view" },
  { prefix: "/finance", permission: "finance.view" },
  { prefix: "/reports", permission: "reports.view" },
];

export function getRequiredPermission(pathname: string): Permission | null {
  const normalized = pathname.split("?")[0] ?? pathname;

  for (const rule of ROUTE_RULES) {
    if (rule.exact) {
      if (normalized === rule.prefix) return rule.permission;
      continue;
    }
    if (
      normalized === rule.prefix ||
      normalized.startsWith(`${rule.prefix}/`)
    ) {
      return rule.permission;
    }
  }

  return null;
}

export function isRouteAllowed(role: AppRole, pathname: string): boolean {
  const permission = getRequiredPermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function resolveSafeRedirect(role: AppRole, redirectTo?: string | null): string {
  const fallback = getDefaultRouteForRole(role);
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return fallback;
  }
  if (redirectTo.startsWith("/login") || redirectTo.startsWith("/access-")) {
    return fallback;
  }
  if (isRouteAllowed(role, redirectTo)) {
    return redirectTo;
  }
  return fallback;
}
