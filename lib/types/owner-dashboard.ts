import type {
  ProfitDirectionBar,
  ProfitTrendPoint,
} from "@/lib/dashboard/owner-chart-metrics";
import type { ResolvedDateRange } from "@/lib/date-range/filter";
import type {
  BusinessDirectionComparisons,
  FinanceBusinessDirectionCards,
} from "@/lib/finance/finance-center-directions";
import type { OwnerAttentionLoadResult } from "@/lib/queries/owner-attention";
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
  documentsProfit: number;
  carsInStock: number;
  commissionCarsInStock: number;
  documentsInProgress: number;
  detailingOrdersToday: number;
  attentionCount: number;
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
  dateRange: ResolvedDateRange;
  period: DashboardPeriod;
  topCards: OwnerTopCards;
  businessDirections: FinanceBusinessDirectionCards;
  businessDirectionComparisons: BusinessDirectionComparisons;
  attention: OwnerAttentionLoadResult;
  attentionQuickActions: {
    documentsStatus: boolean;
    detailingPayment: boolean;
    detailingStatus: boolean;
    carsStatus: boolean;
  };
  charts: OwnerChartsData;
  today: OwnerTodaySection;
  detailing: OwnerDetailingSummary;
  recentActivity: DashboardActivityItem[];
  errors: OwnerDashboardSectionErrors;
};
