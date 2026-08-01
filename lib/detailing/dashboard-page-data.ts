import { EMPTY_DETAILING_DASHBOARD_STATS } from "@/lib/detailing/defaults";
import { safeDetailingQuery, type DetailingQueryWarning } from "@/lib/detailing/query-utils";
import type {
  DetailingDashboardStats,
  DetailingOrderWithServices,
} from "@/lib/types/detailing";
import {
  getDetailingAttentionOrders,
  getDetailingDashboardStats,
  getDetailingHasOrders,
  getRecentDetailingOrders,
  getTodayDetailingAppointments,
} from "@/lib/queries/detailing";

export type DetailingDashboardPageData = {
  stats: DetailingDashboardStats;
  todayAppointments: DetailingOrderWithServices[];
  attention: DetailingOrderWithServices[];
  recentOrders: DetailingOrderWithServices[];
  hasOrders: boolean;
  warnings: DetailingQueryWarning[];
};

export async function loadDetailingDashboardPageData(): Promise<DetailingDashboardPageData> {
  const warnings: DetailingQueryWarning[] = [];

  const [stats, todayAppointments, attention, recentOrders, hasOrders] = await Promise.all([
    safeDetailingQuery(
      "getDetailingDashboardStats",
      getDetailingDashboardStats,
      EMPTY_DETAILING_DASHBOARD_STATS,
      warnings
    ),
    safeDetailingQuery(
      "getTodayDetailingAppointments",
      getTodayDetailingAppointments,
      [],
      warnings
    ),
    safeDetailingQuery(
      "getDetailingAttentionOrders",
      getDetailingAttentionOrders,
      [],
      warnings
    ),
    safeDetailingQuery("getRecentDetailingOrders", () => getRecentDetailingOrders(5), [], warnings),
    safeDetailingQuery("getDetailingHasOrders", getDetailingHasOrders, false, warnings),
  ]);

  return {
    stats,
    todayAppointments,
    attention,
    recentOrders,
    hasOrders,
    warnings,
  };
}
