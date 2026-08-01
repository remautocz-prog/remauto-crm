import { DEFAULT_EMPLOYEE_COMMISSION_PERCENT } from "@/lib/constants/detailing";
import type { DetailingOrderStatus } from "@/lib/constants/detailing";
import { roundMoney } from "@/lib/detailing/pricing";
import type { DetailingOrder, DetailingOrderService } from "@/lib/types/detailing";

export function calculateEmployeeCommission(
  finalPrice: number,
  commissionPercent: number,
  status: DetailingOrderStatus
): number {
  if (status === "cancelled") return 0;
  return roundMoney((Math.max(finalPrice, 0) * commissionPercent) / 100);
}

export function calculateServiceCommission(
  serviceTotalPrice: number,
  commissionPercent: number,
  status: DetailingOrderStatus
): number {
  if (status === "cancelled") return 0;
  const total = roundMoney(Math.max(serviceTotalPrice, 0));
  if (total <= 0) return 0;
  const percent = resolveCommissionPercent(commissionPercent);
  const amount = roundMoney((total * percent) / 100);
  return roundMoney(Math.min(amount, total));
}

export function resolveCommissionPercent(
  employeeCommissionPercent?: number | null
): number {
  if (
    employeeCommissionPercent == null ||
    Number.isNaN(employeeCommissionPercent) ||
    employeeCommissionPercent < 0 ||
    employeeCommissionPercent > 100
  ) {
    return DEFAULT_EMPLOYEE_COMMISSION_PERCENT;
  }
  return employeeCommissionPercent;
}

export function isCommissionFinalized(status: DetailingOrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

export function projectedOrFinalCommission(
  finalPrice: number,
  commissionPercent: number,
  status: DetailingOrderStatus
): number {
  return calculateEmployeeCommission(finalPrice, commissionPercent, status);
}

export function hasServiceLevelAssignments(
  services: Array<{ assigned_employee_id?: string | null }>
): boolean {
  return services.some((service) => Boolean(service.assigned_employee_id));
}

export function sumServiceCommissions(
  services: Array<{ commission_amount?: number | null }>,
  status: DetailingOrderStatus
): number {
  if (status === "cancelled") return 0;
  return roundMoney(
    services.reduce((sum, service) => sum + Math.max(service.commission_amount ?? 0, 0), 0)
  );
}

export function resolveOrderTotalCommission(
  order: Pick<
    DetailingOrder,
    | "final_price"
    | "status"
    | "assigned_employee_id"
    | "employee_commission_percent_snapshot"
    | "employee_commission_amount"
  >,
  services: DetailingOrderService[],
  status: DetailingOrderStatus = order.status
): number {
  if (status === "cancelled") return 0;

  if (hasServiceLevelAssignments(services)) {
    return sumServiceCommissions(services, status);
  }

  if (
    order.employee_commission_amount != null &&
    (status === "delivered" || order.status === "delivered")
  ) {
    return roundMoney(Math.max(order.employee_commission_amount, 0));
  }

  if (!order.assigned_employee_id) return 0;

  return calculateEmployeeCommission(
    order.final_price,
    resolveCommissionPercent(order.employee_commission_percent_snapshot),
    status
  );
}

export function resolveCompanyRemainder(
  finalPrice: number,
  totalEmployeeCommissions: number
): number {
  return roundMoney(Math.max(finalPrice - Math.max(totalEmployeeCommissions, 0), 0));
}

export type ServiceCommissionInput = {
  total_price: number;
  assigned_employee_id?: string | null;
  commission_percent?: number | null;
  employee_name_snapshot?: string | null;
  commission_percent_snapshot?: number | null;
  commission_amount?: number | null;
};

export function buildServiceCommissionSnapshot(
  service: ServiceCommissionInput,
  status: DetailingOrderStatus
): {
  assigned_employee_id: string | null;
  employee_name_snapshot: string | null;
  commission_percent_snapshot: number | null;
  commission_amount: number;
} {
  const assignedEmployeeId = service.assigned_employee_id ?? null;

  if (!assignedEmployeeId) {
    return {
      assigned_employee_id: null,
      employee_name_snapshot: null,
      commission_percent_snapshot: null,
      commission_amount: 0,
    };
  }

  const percent = resolveCommissionPercent(service.commission_percent);
  const amount = calculateServiceCommission(service.total_price, percent, status);

  return {
    assigned_employee_id: assignedEmployeeId,
    employee_name_snapshot: service.employee_name_snapshot?.trim() || null,
    commission_percent_snapshot: percent,
    commission_amount: amount,
  };
}
