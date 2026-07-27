import type {
  ClientPreferredLanguage,
  ClientType,
} from "@/lib/constants/clients";

export type Client = {
  id: number;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  client_type: ClientType;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  preferred_language: ClientPreferredLanguage | null;
  tax_id: string | null;
  vat_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientFormInput = {
  client_type: ClientType;
  full_name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  preferred_language?: ClientPreferredLanguage | null;
  tax_id?: string | null;
  vat_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type ClientsListParams = {
  q?: string;
  client_type?: string;
  country?: string;
  preferred_language?: string;
  sort?: string;
};

export type ClientDuplicateMatch = {
  id: number;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  matchReason: "phone" | "email" | "company" | "tax_id";
};

export type ClientRelatedCounts = {
  carsAsBuyer: number;
  carsAsOwner: number;
  documentTasks: number;
  detailingOrders: number;
  financeTransactions: number;
};

export type ClientActivityItem = {
  id: string;
  kind:
    | "client_created"
    | "car_added"
    | "car_sold"
    | "document_created"
    | "document_completed"
    | "detailing_created"
    | "detailing_completed"
    | "payment_registered";
  title: string;
  subtitle?: string | null;
  occurredAt: string;
  href?: string | null;
};
