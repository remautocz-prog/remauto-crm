export type NavItemKey =
  | "dashboard"
  | "adminDashboard"
  | "accountingDashboard"
  | "cars"
  | "clients"
  | "documents"
  | "deals"
  | "detailing"
  | "finance"
  | "reports"
  | "settings";

export type NavIconId =
  | "layout-dashboard"
  | "car"
  | "users"
  | "file-text"
  | "handshake"
  | "sparkles"
  | "wallet"
  | "bar-chart-3"
  | "settings";

export type NavItem = {
  key: NavItemKey;
  href: string;
  icon: NavIconId;
};

export const navItems: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { key: "adminDashboard", href: "/admin/dashboard", icon: "layout-dashboard" },
  { key: "accountingDashboard", href: "/accounting/dashboard", icon: "wallet" },
  { key: "cars", href: "/cars", icon: "car" },
  { key: "clients", href: "/clients", icon: "users" },
  { key: "documents", href: "/documents", icon: "file-text" },
  { key: "deals", href: "/deals", icon: "handshake" },
  { key: "detailing", href: "/detailing", icon: "sparkles" },
  { key: "finance", href: "/finance", icon: "wallet" },
  { key: "reports", href: "/reports", icon: "bar-chart-3" },
  { key: "settings", href: "/settings", icon: "settings" },
];
