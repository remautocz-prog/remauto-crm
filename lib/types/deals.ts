import type {
  DealCurrency,
  DealHandoverSide,
  DealPaymentMethod,
  DealPaymentPayer,
  DealPaymentStatus,
  DealStatus,
  DealType,
  DealVehicleSource,
} from "@/lib/constants/deals";

export type DealVehicleSnapshot = {
  source: DealVehicleSource;
  car_id: number | null;
  make: string;
  model: string;
  full_name: string;
  vin: string;
  registration_plate: string;
  first_registration_date: string;
  mileage: string;
  fuel_type: string;
  engine_capacity: string;
  power_kw: string;
  color: string;
  technical_certificate_number: string;
  key_count: string;
  agreed_value: string;
};

export type DealClientSnapshot = {
  client_id: number | null;
  client_type: string;
  full_name: string;
  company_name: string;
  birth_date: string;
  personal_id_number: string;
  identity_document_number: string;
  tax_id: string;
  vat_id: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  bank_account: string;
};

export type DealCompanySnapshot = {
  name: string;
  ico: string;
  dic: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  bank_account: string;
};

export type Deal = {
  id: string;
  deal_number: string;
  deal_type: DealType;
  status: DealStatus;
  client_id: number | null;
  vehicle_a_id: number | null;
  vehicle_b_id: number | null;
  vehicle_a_source: DealVehicleSource;
  vehicle_b_source: DealVehicleSource;
  vehicle_a_snapshot: DealVehicleSnapshot;
  vehicle_b_snapshot: DealVehicleSnapshot;
  client_snapshot: DealClientSnapshot;
  company_snapshot: DealCompanySnapshot;
  vehicle_a_value: number | null;
  vehicle_b_value: number | null;
  additional_payment: number | null;
  additional_payment_words: string | null;
  currency: DealCurrency;
  additional_payment_payer: DealPaymentPayer | null;
  payment_method: DealPaymentMethod | null;
  payment_account: string | null;
  payment_due_date: string | null;
  payment_paid_at: string | null;
  payment_status: DealPaymentStatus;
  custom_payment_method: string | null;
  signing_place: string | null;
  signing_date: string | null;
  vehicle_a_known_defects: string | null;
  vehicle_b_known_defects: string | null;
  legal_defects_notes: string | null;
  service_budget: number | null;
  additional_terms: string | null;
  handover_date: string | null;
  handover_time: string | null;
  handover_place: string | null;
  handover_notes: string | null;
  cancelled_reason: string | null;
  signed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DealHandoverDetail = {
  id: string;
  deal_id: string;
  vehicle_side: DealHandoverSide;
  handover_datetime: string | null;
  mileage: number | null;
  fuel_level: string | null;
  key_count: number | null;
  documents: string[];
  accessories: string | null;
  visible_damage: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DealWithRelations = Deal & {
  client?: {
    id: number;
    full_name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    client_type: string;
  } | null;
  vehicle_a?: {
    id: number;
    brand: string;
    model: string;
    year: number;
    vin: string | null;
    registration_number: string | null;
  } | null;
  vehicle_b?: {
    id: number;
    brand: string;
    model: string;
    year: number;
    vin: string | null;
    registration_number: string | null;
  } | null;
  assignee?: { id: string; full_name: string | null } | null;
  creator?: { id: string; full_name: string | null } | null;
  handover_details?: DealHandoverDetail[];
};

export type DealExternalVehicleInput = {
  make: string;
  model: string;
  vin?: string | null;
  registration_plate?: string | null;
  first_registration_date?: string | null;
  mileage?: number | null;
  fuel_type?: string | null;
  engine_capacity?: string | null;
  power_kw?: number | null;
  color?: string | null;
  technical_certificate_number?: string | null;
  key_count?: number | null;
  agreed_value?: number | null;
  year?: number | null;
};

export type DealHandoverSideInput = {
  deal_id: string;
  vehicle_side: DealHandoverSide;
  handover_datetime?: string | null;
  mileage?: number | null;
  fuel_level?: string | null;
  key_count?: number | null;
  documents?: string[];
  accessories?: string | null;
  visible_damage?: string | null;
  notes?: string | null;
};

export type DealFormInput = {
  deal_type: DealType;
  client_id?: number | null;
  vehicle_a_id?: number | null;
  vehicle_b_id?: number | null;
  vehicle_a_source?: DealVehicleSource;
  vehicle_b_source?: DealVehicleSource;
  vehicle_a_external?: DealExternalVehicleInput | null;
  vehicle_b_external?: DealExternalVehicleInput | null;
  vehicle_a_value?: number | null;
  vehicle_b_value?: number | null;
  additional_payment?: number | null;
  additional_payment_words?: string | null;
  currency?: DealCurrency;
  additional_payment_payer?: DealPaymentPayer | null;
  payment_method?: DealPaymentMethod | null;
  payment_account?: string | null;
  payment_due_date?: string | null;
  payment_status?: DealPaymentStatus;
  custom_payment_method?: string | null;
  signing_place?: string | null;
  signing_date?: string | null;
  vehicle_a_known_defects?: string | null;
  vehicle_b_known_defects?: string | null;
  legal_defects_notes?: string | null;
  service_budget?: number | null;
  additional_terms?: string | null;
  handover_date?: string | null;
  handover_time?: string | null;
  handover_place?: string | null;
  handover_notes?: string | null;
  assigned_to?: string | null;
  save_vehicle_b_to_crm?: boolean;
};

export type DealsListParams = {
  q?: string;
  status?: string;
  payment_status?: string;
  payer?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  archived?: boolean;
  filter?: string;
};

export type DealDashboardMetrics = {
  activeDeals: number;
  unsignedPreparedDeals: number;
  awaitingPayment: number;
  overduePayments: number;
  handoversToday: number;
  completedThisMonth: number;
};

export type DealActivityItem = {
  id: string;
  kind:
    | "deal_created"
    | "deal_updated"
    | "deal_status_changed"
    | "deal_payment_changed"
    | "deal_snapshot_refreshed"
    | "deal_document_generated"
    | "deal_archived"
    | "deal_cancelled";
  title: string;
  subtitle?: string | null;
  occurredAt: string;
  href?: string | null;
};

export type DealPaymentCalculation = {
  difference: number;
  suggestedPayer: DealPaymentPayer;
  suggestedAdditionalPayment: number;
};
