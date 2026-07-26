import {
  Car,
  FileText,
  Sparkles,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Cars", href: "/cars", icon: Car },
  { title: "Clients", href: "/clients", icon: Users },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Detailing", href: "/detailing", icon: Sparkles },
  { title: "Finance", href: "/finance", icon: Wallet },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];
