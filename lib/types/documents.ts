import type {
  DocumentPaymentStatus,
  DocumentPriority,
  DocumentServiceType,
  DocumentTaskStatus,
  PaymentMethod,
} from "@/lib/constants/documents";
import type { DocumentVehicleMode } from "@/lib/documents/vehicle";

export type ChecklistItem = {
  key: string;
  custom?: boolean;
  label?: string;
};

export type DocumentTaskService = {
  id: string;
  document_task_id: number;
  service_name: string;
  service_price: number;
  cost_price: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DocumentTaskServiceFormInput = {
  id?: string;
  service_name: string;
  /** Optional catalog code — used for checklist only, never for pricing. */
  service_code?: string | null;
  service_price: number;
  cost_price: number;
  notes?: string | null;
  sort_order?: number;
};

export type DocumentTask = {
  id: number;
  client_id: number | null;
  car_id: number | null;
  vehicle_mode: DocumentVehicleMode | string;
  vehicle_vin: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  /** Current service identifier (Documents module). */
  service_type: DocumentServiceType | string | null;
  /** Legacy NOT NULL column — same value as service_type on write. */
  work_type: DocumentServiceType | string | null;
  custom_service_name: string | null;
  /** Line items — when present, totals are derived from these rows. */
  services?: DocumentTaskService[];
  assigned_to: string | null;
  status: DocumentTaskStatus | string;
  priority: DocumentPriority | string;
  started_at: string | null;
  due_date: string | null;
  deadline: string | null;
  completed_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  service_price: number | null;
  cost_price: number | null;
  paid_amount: number;
  payment_status: DocumentPaymentStatus | string;
  paid_at: string | null;
  payment_method: PaymentMethod | string | null;
  document_count: number;
  required_documents: ChecklistItem[];
  received_documents: ChecklistItem[];
  notes: string | null;
  result_notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Database insert/update payload for document_tasks (includes legacy work_type). */
export type DocumentTaskDbPayload = {
  client_id: number;
  car_id: number | null;
  vehicle_mode: DocumentVehicleMode | string;
  vehicle_vin: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  service_type: string | null;
  work_type: string | null;
  custom_service_name: string | null;
  assigned_to: string | null;
  status: DocumentTaskStatus | string;
  priority: DocumentPriority | string;
  started_at: string | null;
  due_date: string | null;
  service_price: number | null;
  cost_price: number | null;
  paid_amount: number;
  payment_status: DocumentPaymentStatus | string;
  paid_at: string | null;
  payment_method: PaymentMethod | string | null;
  document_count: number;
  required_documents: ChecklistItem[];
  received_documents: ChecklistItem[];
  notes: string | null;
  result_notes: string | null;
};

export type DocumentTaskFormInput = {
  client_id: number | null;
  car_id: number | null;
  vehicle_mode: DocumentVehicleMode | string;
  vehicle_vin?: string | null;
  vehicle_plate?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  service_type: DocumentServiceType | string | null;
  custom_service_name?: string | null;
  services?: DocumentTaskServiceFormInput[];
  assigned_to?: string | null;
  status: DocumentTaskStatus | string;
  priority: DocumentPriority | string;
  started_at?: string | null;
  due_date?: string | null;
  service_price?: number | null;
  cost_price?: number | null;
  paid_amount?: number | null;
  /** UI-only: syncs paid_amount to service_price when checked. */
  paid_in_full?: boolean;
  payment_method?: PaymentMethod | string | null;
  document_count?: number | null;
  required_documents?: ChecklistItem[];
  received_documents?: ChecklistItem[];
  notes?: string | null;
  result_notes?: string | null;
};

export type DocumentTasksListParams = {
  q?: string;
  status?: string;
  priority?: string;
  service_type?: string;
  assigned_to?: string;
  payment_status?: string;
  overdue?: boolean;
  archived?: boolean;
  sort?: string;
};

export type DocumentTaskWithRelations = DocumentTask & {
  client?: {
    id: number;
    full_name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    client_type?: string | null;
  } | null;
  car?: {
    id: number;
    brand: string;
    model: string;
    year: number;
    vin: string | null;
    registration_number: string | null;
    client_id: number | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
  } | null;
};

export type DocumentPaymentInput = {
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | string;
  note?: string | null;
};

export type DocumentStatusChangeInput = {
  status: DocumentTaskStatus | string;
  result_notes?: string | null;
  confirmUnpaidDelivery?: boolean;
  confirmOverpayment?: boolean;
};

export type DocumentTaskFinanceSummary = {
  servicePrice: number;
  costPrice: number;
  paidAmount: number;
  outstandingBalance: number;
  profit: number;
  paymentStatus: DocumentPaymentStatus | string;
  serviceCount: number;
  usesServiceRows: boolean;
};

export type DocumentDashboardMetrics = {
  activeTasks: number;
  newTasks: number;
  overdueTasks: number;
  waitingClient: number;
  waitingOffice: number;
  completedThisMonth: number;
  unpaidBalance: number;
  monthlyRevenue: number;
  monthlyProfit: number;
};

export type DocumentDashboardAlert = {
  id: string;
  kind:
    | "overdue"
    | "due_today"
    | "due_soon"
    | "completed_unpaid"
    | "ready_for_delivery";
  taskId: number;
  title: string;
  subtitle?: string | null;
  href: string;
};
