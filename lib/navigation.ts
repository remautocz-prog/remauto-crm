import {
  Car,
  FileText,
  Handshake,
  Sparkles,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type NavItemKey =
  | "dashboard"
  | "cars"
  | "clients"
  | "documents"
  | "deals"
  | "detailing"
  | "finance"
  | "reports"
  | "settings";

export type NavItem = {
  key: NavItemKey;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "cars", href: "/cars", icon: Car },
  { key: "clients", href: "/clients", icon: Users },
  { key: "documents", href: "/documents", icon: FileText },
  { key: "deals", href: "/deals", icon: Handshake },
  { key: "detailing", href: "/detailing", icon: Sparkles },
  { key: "finance", href: "/finance", icon: Wallet },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
];
