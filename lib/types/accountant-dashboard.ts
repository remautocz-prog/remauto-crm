import type { ResolvedDateRange } from "@/lib/date-range/filter";

export type AccountantModule = "documents" | "detailing" | "cars";

export type AccountantPaymentRow = {
  id: string;
  module: AccountantModule;
  entityId: string;
  client: string;
  vehicle: string;
  amount: number;
  paid: number;
  remaining: number;
  status: string;
  daysOverdue: number | null;
  occurredAt: string;
  href: string;
  paymentMethod: string | null;
};

export type AccountantKpis = {
  incomingToday: number;
  unpaidCount: number;
  outstandingReceivables: number;
  expensesAwaitingVerification: number;
  financialTasksToday: number;
};

export type AccountantIncomeBySource = {
  cars: number;
  detailing: number;
  documents: number;
  total: number;
};

export type AccountantExpenseRow = {
  id: string;
  module: "cars" | "detailing" | "documents";
  label: string;
  amount: number;
  date: string;
  href: string | null;
};

export type AccountantExpenseSection = {
  periodTotal: number;
  todayTotal: number;
  pendingVerificationCount: number;
  byModule: {
    cars: number;
    detailing: number;
    documents: number;
  };
  recent: AccountantExpenseRow[];
};

export type AccountantFinancialTask = {
  id: string;
  kind:
    | "verify_payment"
    | "outstanding_invoice"
    | "missing_sale_price"
    | "missing_vehicle_expense"
    | "payment_reminder";
  title: string;
  subtitle: string;
  href: string;
  priority: "high" | "medium";
};

export type AccountantDashboardSectionErrors = {
  core?: boolean;
  expenses?: boolean;
  receivables?: boolean;
};

export type AccountantDashboardData = {
  dateRange: ResolvedDateRange;
  kpis: AccountantKpis;
  incomeBySource: AccountantIncomeBySource;
  receivables: AccountantPaymentRow[];
  awaitingPayment: {
    documents: AccountantPaymentRow[];
    detailing: AccountantPaymentRow[];
    cars: AccountantPaymentRow[];
  };
  expenses: AccountantExpenseSection;
  financialTasks: AccountantFinancialTask[];
  recentPayments: AccountantPaymentRow[];
  quickActions: {
    canManageExpenses: boolean;
    canViewFinanceCenter: boolean;
    canViewDocuments: boolean;
  };
  errors: AccountantDashboardSectionErrors;
};
