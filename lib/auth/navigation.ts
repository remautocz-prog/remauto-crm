import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/roles";
import {
  navItems,
  type NavItem,
  type NavItemKey,
} from "@/lib/navigation";

const NAV_PERMISSIONS: Record<
  Exclude<NavItemKey, "adminDashboard" | "accountingDashboard">,
  Permission
> = {
  dashboard: "owner.dashboard",
  cars: "cars.view",
  clients: "clients.view",
  documents: "documents.view",
  deals: "deals.view",
  detailing: "detailing.view",
  finance: "finance.view",
  reports: "reports.view",
  settings: "settings.view",
};

export function getNavItemsForRole(role: AppRole): NavItem[] {
  const items = navItems.filter((item) => {
    if (item.key === "adminDashboard") {
      return hasPermission(role, "admin.dashboard");
    }
    if (item.key === "accountingDashboard") {
      return hasPermission(role, "accounting.dashboard");
    }
    return hasPermission(
      role,
      NAV_PERMISSIONS[
        item.key as Exclude<NavItemKey, "adminDashboard" | "accountingDashboard">
      ]
    );
  });

  return items
    .filter((item) => {
      if (role === "admin" && item.key === "dashboard") {
        return false;
      }
      return true;
    })
    .map((item) => {
      if (item.key === "documents" && role === "documents") {
        return { ...item, href: "/documents/dashboard" };
      }
      return item;
    });
}

export function getNavPermission(key: NavItemKey): Permission {
  if (key === "adminDashboard") return "admin.dashboard";
  if (key === "accountingDashboard") return "accounting.dashboard";
  return NAV_PERMISSIONS[key];
}

export type DetailingNavKey =
  | "dashboard"
  | "orders"
  | "newOrder"
  | "finance"
  | "expenses"
  | "employees"
  | "services";

const DETAILING_NAV_PERMISSIONS: Record<DetailingNavKey, Permission> = {
  dashboard: "detailing.view",
  orders: "detailing.view",
  newOrder: "detailing.create",
  finance: "detailing.finance.view",
  expenses: "detailing.expenses.manage",
  employees: "users.view",
  services: "detailing.view",
};

export function getDetailingNavKeysForRole(role: AppRole): DetailingNavKey[] {
  return (Object.keys(DETAILING_NAV_PERMISSIONS) as DetailingNavKey[]).filter(
    (key) => hasPermission(role, DETAILING_NAV_PERMISSIONS[key])
  );
}
