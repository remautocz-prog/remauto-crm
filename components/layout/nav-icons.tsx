"use client";

import {
  BarChart3,
  Car,
  FileText,
  Handshake,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavIconId } from "@/lib/navigation";

export const NAV_ICONS: Record<NavIconId, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  car: Car,
  users: Users,
  "file-text": FileText,
  handshake: Handshake,
  sparkles: Sparkles,
  wallet: Wallet,
  "bar-chart-3": BarChart3,
  settings: Settings,
};

export function getNavIcon(iconId: NavIconId): LucideIcon {
  return NAV_ICONS[iconId];
}
