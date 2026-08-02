import type { Car, ClientOption } from "@/lib/types/cars";
import type { DashboardPeriod } from "@/lib/dashboard/period";
import type { DealDashboardMetrics } from "@/lib/types/deals";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type DashboardAttentionMetrics = {
  overdueOrders: number;
  dueTodayOrders: number;
  urgentActiveOrders: number;
  unassignedActiveOrders: number;
  unpaidDocumentBalance: number;
};

export type DashboardDocumentFinance = {
  revenue: number;
  costs: number;
  profit: number;
  collected: number;
  outstanding: number;
};

export type DashboardCarFinance = {
  activeInventoryValue: number;
  soldRevenue: number;
  soldProfit: number;
};

export type DashboardFinancialOverview = {
  documents: DashboardDocumentFinance;
  cars: DashboardCarFinance;
  combinedProfit: number;
};

export type DashboardBusinessOverview = {
  activeCars: number;
  reservedCars: number;
  soldThisPeriod: number;
  commissionCars: number;
  activeDocumentOrders: number;
  completedThisPeriod: number;
  unpaidOrders: number;
  overdueOrders: number;
  activeClients: number;
  newClientsThisPeriod: number;
  clientsWithDebt: number;
};

export type DashboardEmployeeWorkloadRow = {
  employeeId: string | null;
  employeeName: string;
  activeOrders: number;
  overdueOrders: number;
  dueTodayOrders: number;
  urgentOrders: number;
  href: string;
};

export type DashboardActivityKind =
  | "client_created"
  | "client_updated"
  | "note_added"
  | "vehicle_created"
  | "vehicle_sold"
  | "order_created"
  | "status_changed"
  | "priority_changed"
  | "employee_assigned"
  | "payment_marked"
  | "detailing_created"
  | "detailing_status_changed"
  | "expense_added";

export type DashboardActivityItem = {
  id: string;
  kind: DashboardActivityKind;
  /** Related client, vehicle, or order name. */
  entityName: string;
  /** Optional metadata: status code, priority, amount, etc. */
  meta?: string | null;
  /** Short note preview — never full note text. */
  preview?: string | null;
  employeeName?: string | null;
  occurredAt: string;
  href?: string | null;
};

export type DashboardSectionErrors = {
  documents?: string;
  cars?: string;
  clients?: string;
  notes?: string;
  activity?: string;
  deals?: string;
};

export type OperationsDashboardData = {
  period: DashboardPeriod;
  attention: DashboardAttentionMetrics;
  todaysWork: DocumentTaskWithRelations[];
  financial: DashboardFinancialOverview;
  business: DashboardBusinessOverview;
  employeeWorkload: DashboardEmployeeWorkloadRow[];
  recentActivity: DashboardActivityItem[];
  recentCars: Car[];
  clientOptions: ClientOption[];
  deals: DealDashboardMetrics;
  errors: DashboardSectionErrors;
};
