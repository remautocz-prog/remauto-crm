import type {
  DetailingExpenseCategory,
  DetailingOrderStatus,
  DetailingPaymentMethod,
  DetailingPaymentStatus,
  DetailingPriceType,
  DetailingServiceCategory,
  DetailingVehicleSize,
} from "@/lib/constants/detailing";

export type DetailingService = {
  id: string;
  category: DetailingServiceCategory;
  name_cs: string;
  name_ru: string;
  description_cs: string | null;
  description_ru: string | null;
  base_price: number | null;
  max_price: number | null;
  price_type: DetailingPriceType;
  unit: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DetailingOrderService = {
  id: string;
  order_id: string;
  service_id: string | null;
  service_name_snapshot: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  notes: string | null;
  assigned_employee_id: string | null;
  employee_name_snapshot: string | null;
  commission_percent_snapshot: number | null;
  commission_amount: number;
  created_at: string;
};

export type DetailingOrder = {
  id: string;
  order_number: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  vehicle_make_model: string;
  registration_number: string;
  vehicle_size: DetailingVehicleSize;
  surcharge_percent_snapshot: number;
  appointment_date: string;
  appointment_time: string;
  expected_completion_at: string | null;
  actual_completion_at: string | null;
  status: DetailingOrderStatus;
  notes: string | null;
  assigned_employee_id: string | null;
  employee_name_snapshot: string | null;
  employee_commission_percent_snapshot: number | null;
  employee_commission_amount: number | null;
  payment_method: DetailingPaymentMethod | null;
  services_subtotal: number;
  vehicle_surcharge_amount: number;
  discount_amount: number;
  final_price: number;
  deposit_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: DetailingPaymentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DetailingOrderWithServices = DetailingOrder & {
  services: DetailingOrderService[];
};

export type DetailingEmployeeSettings = {
  id: string;
  profile_id: string;
  active: boolean;
  commission_percent: number;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DetailingEmployeeWithProfile = DetailingEmployeeSettings & {
  profile?: {
    id: string;
    full_name: string | null;
  } | null;
};

export type DetailingExpense = {
  id: string;
  expense_date: string;
  category: DetailingExpenseCategory;
  description: string;
  amount: number;
  payment_method: DetailingPaymentMethod | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DetailingOrderServiceInput = {
  id?: string;
  service_id?: string | null;
  service_name_snapshot: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  notes?: string | null;
  price_type?: DetailingPriceType | null;
  assigned_employee_id?: string | null;
  commission_percent?: number | null;
  employee_name_snapshot?: string | null;
  commission_percent_snapshot?: number | null;
  commission_amount?: number | null;
};

export type DetailingOrderFormInput = {
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  is_internal_vehicle?: boolean;
  vehicle_make_model: string;
  registration_number: string;
  vehicle_size: DetailingVehicleSize;
  appointment_date: string;
  appointment_time: string;
  expected_completion_at?: string | null;
  actual_completion_at?: string | null;
  status: DetailingOrderStatus;
  notes?: string | null;
  assigned_employee_id?: string | null;
  payment_method?: DetailingPaymentMethod | null;
  services: DetailingOrderServiceInput[];
  services_subtotal?: number | null;
  vehicle_surcharge_amount?: number | null;
  discount_amount?: number | null;
  final_price?: number | null;
  deposit_amount?: number | null;
  paid_amount?: number | null;
  final_price_override?: number | null;
};

export type DetailingDashboardStats = {
  todayAppointments: number;
  carsInProgress: number;
  carsReady: number;
  revenueToday: number;
  monthDeliveredOrders: number;
  monthRevenue: number;
  monthCommissions: number;
  monthExpenses: number;
  monthNetResult: number;
};

export type DetailingEmployeeMonthStats = {
  profileId: string;
  assignedServices: number;
  deliveredOrders: number;
  revenueGenerated: number;
  commissionPayable: number;
};

export type DetailingExpenseMonthSummary = {
  total: number;
  count: number;
  largestCategory: DetailingExpenseCategory | null;
  largestCategoryAmount: number;
};

export type DetailingServiceFormInput = {
  id?: string;
  name_cs: string;
  name_ru: string;
  description_cs?: string | null;
  description_ru?: string | null;
  category: DetailingServiceCategory;
  base_price?: number | null;
  max_price?: number | null;
  price_type: DetailingPriceType;
  unit?: string | null;
  active: boolean;
  sort_order: number;
};

export type DetailingFinanceReport = {
  orderCount: number;
  deliveredRevenue: number;
  employeeCommissions: number;
  expenses: number;
  netResult: number;
  averageOrderValue: number;
  employeeSummaries: Array<{
    employeeId: string | null;
    employeeName: string;
    assignedServices: number;
    deliveredOrders: number;
    revenueGenerated: number;
    commissionPercent: number;
    commissionPayable: number;
  }>;
  expensesByCategory: Array<{
    category: DetailingExpenseCategory;
    amount: number;
  }>;
};
