import type {
  BusinessModel,
  CommissionType,
} from "@/lib/constants/business-model";

export type Car = {
  id: number;
  stock_number: string | null;
  vin: string | null;
  brand: string;
  model: string;
  year: number;
  registration_number: string | null;
  color: string | null;
  status: string;
  business_model: BusinessModel;
  commission_type: CommissionType | null;
  commission_value: number | null;
  owner_net_amount: number | null;
  owner_client_id: number | null;
  contract_end_date: string | null;
  contract_document_url: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  actual_sale_price: number | null;
  purchase_date: string | null;
  sale_date: string | null;
  client_id: number | null;
  manager_id: string | null;
  notes: string | null;
  first_registration_date: string | null;
  fuel_type: string | null;
  engine_capacity: string | null;
  power_kw: number | null;
  technical_certificate_number: string | null;
  key_count: number | null;
  mileage: number | null;
  created_at: string;
  updated_at: string;
};

export type CarExpense = {
  id: number;
  car_id: number;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  source_detailing_order_id?: string | null;
  created_at: string;
};

export type CarFormInput = {
  stock_number?: string | null;
  vin?: string | null;
  brand: string;
  model: string;
  year: number;
  registration_number?: string | null;
  color?: string | null;
  status: string;
  business_model: BusinessModel;
  commission_type?: CommissionType | null;
  commission_value?: number | null;
  owner_net_amount?: number | null;
  owner_client_id?: number | null;
  contract_end_date?: string | null;
  contract_document_url?: string | null;
  purchase_price?: number | null;
  sale_price?: number | null;
  actual_sale_price?: number | null;
  purchase_date?: string | null;
  sale_date?: string | null;
  client_id?: number | null;
  manager_id?: string | null;
  notes?: string | null;
  first_registration_date?: string | null;
  fuel_type?: string | null;
  engine_capacity?: string | null;
  power_kw?: number | null;
  technical_certificate_number?: string | null;
  key_count?: number | null;
  mileage?: number | null;
};

export type CarExpenseInput = {
  category: string;
  amount: number;
  description?: string | null;
  expense_date: string;
  source_detailing_order_id?: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
};

export type ClientOption = {
  id: number;
  full_name: string;
  email: string | null;
};

export type CarsListParams = {
  q?: string;
  status?: string;
  business_model?: string;
  inventory?: "active" | "sold";
  sort?: string;
};

export { calculateCarProfit } from "@/lib/cars/business-rules";
