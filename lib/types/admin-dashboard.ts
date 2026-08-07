import type { AdminTeamWorkloadRow } from "@/lib/dashboard/admin-team-workload";
import type { OwnerAttentionRow } from "@/lib/dashboard/owner-attention";
import type { OwnerAttentionLoadResult } from "@/lib/queries/owner-attention";
import type { Car } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type AdminOperationalKpis = {
  requiresAttention: number;
  overdueDocuments: number;
  detailingInProgress: number;
  unpaidDetailing: number;
  carsRequiringAction: number;
};

export type AdminOptionalFinanceKpis = {
  unpaidDetailingBalance: number;
};

export type AdminTodaySection = {
  documentsDueToday: DocumentTaskWithRelations[];
  documentsOverdue: DocumentTaskWithRelations[];
  detailingScheduledToday: DetailingOrderWithServices[];
  detailingReady: DetailingOrderWithServices[];
  detailingCompletionToday: DetailingOrderWithServices[];
  carsSaleToday: Car[];
};

export type AdminDashboardSectionErrors = {
  documents?: boolean;
  detailing?: boolean;
  cars?: boolean;
  team?: boolean;
};

export type AdminDashboardData = {
  kpis: AdminOperationalKpis;
  optionalFinance: AdminOptionalFinanceKpis | null;
  attention: OwnerAttentionLoadResult;
  attentionQuickActions: {
    documentsStatus: boolean;
    detailingPayment: boolean;
    detailingStatus: boolean;
    carsStatus: boolean;
  };
  today: AdminTodaySection;
  teamWorkload: AdminTeamWorkloadRow[];
  stuckProcesses: OwnerAttentionRow[];
  quickActions: {
    canCreateDocument: boolean;
    canCreateDetailing: boolean;
    canCreateCar: boolean;
  };
  errors: AdminDashboardSectionErrors;
};
