import type {
  ProfitDirectionBar,
  ProfitTrendPoint,
} from "@/lib/dashboard/owner-chart-metrics";
import type { DashboardActivityItem } from "@/lib/types/dashboard";
import type { DashboardPeriod } from "@/lib/dashboard/period";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type OwnerDashboardSectionErrors = {
  cars?: boolean;
  documents?: boolean;
  detailing?: boolean;
  clients?: boolean;
  activity?: boolean;
  charts?: boolean;
};

export type OwnerTopCards = {
  monthlyProfit: number;
  carsInStock: number;
  commissionCarsInStock: number;
  documentsInProgress: number;
  detailingOrdersToday: number;
  attentionCount: number;
};

export type OwnerAttentionSeverity = "critical" | "warning" | "info";

export type OwnerAttentionItem = {
  id: string;
  labelKey:
    | "attentionDocumentsOverdue"
    | "attentionDetailingUnpaid"
    | "attentionDetailingReady"
    | "attentionSoldMissingPrice"
    | "attentionActiveMissingSalePrice";
  count: number;
  href: string;
  severity: OwnerAttentionSeverity;
};

export type OwnerChartsData = {
  profitTrend: ProfitTrendPoint[];
  profitByDirection: ProfitDirectionBar[];
};

export type OwnerDetailingSummary = {
  stats: import("@/lib/types/detailing").DetailingDashboardStats;
};

export type OwnerTodaySection = {
  detailingAppointments: DetailingOrderWithServices[];
  detailingReady: DetailingOrderWithServices[];
  documentsDueToday: DocumentTaskWithRelations[];
  overdueTasks: DocumentTaskWithRelations[];
};

export type OwnerDashboardData = {
  period: DashboardPeriod;
  topCards: OwnerTopCards;
  charts: OwnerChartsData;
  attentionItems: OwnerAttentionItem[];
  today: OwnerTodaySection;
  detailing: OwnerDetailingSummary;
  recentActivity: DashboardActivityItem[];
  errors: OwnerDashboardSectionErrors;
};
