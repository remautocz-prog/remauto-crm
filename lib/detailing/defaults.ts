import type {
  DetailingDashboardStats,
  DetailingFinanceReport,
} from "@/lib/types/detailing";

export const EMPTY_DETAILING_DASHBOARD_STATS: DetailingDashboardStats = {
  todayAppointments: 0,
  carsInProgress: 0,
  carsReady: 0,
  revenueToday: 0,
  monthDeliveredOrders: 0,
  monthRevenue: 0,
  monthCommissions: 0,
  monthExpenses: 0,
  monthNetResult: 0,
};

export const EMPTY_DETAILING_FINANCE_REPORT: DetailingFinanceReport = {
  orderCount: 0,
  deliveredRevenue: 0,
  employeeCommissions: 0,
  expenses: 0,
  netResult: 0,
  averageOrderValue: 0,
  employeeSummaries: [],
  expensesByCategory: [],
};
