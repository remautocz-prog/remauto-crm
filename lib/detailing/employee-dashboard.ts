import { ACTIVE_DETAILING_ORDER_STATUSES } from "@/lib/constants/detailing";
import { isDateWithinRange, type ResolvedDateRange } from "@/lib/date-range/filter";
import {
  calculateEmployeeCommission,
  hasServiceLevelAssignments,
  resolveCommissionPercent,
} from "@/lib/detailing/commission";
import { roundMoney } from "@/lib/detailing/pricing";
import type {
  DetailingEmployeeDashboardData,
  DetailingEmployeeDashboardKpis,
  DetailingEmployeeDashboardOrder,
  DetailingOrderWithServices,
} from "@/lib/types/detailing";

export function isOrderRelevantToEmployee(
  order: DetailingOrderWithServices,
  employeeId: string
): boolean {
  if (hasServiceLevelAssignments(order.services)) {
    return order.services.some(
      (service) => service.assigned_employee_id === employeeId
    );
  }

  return order.assigned_employee_id === employeeId;
}

export function resolveEmployeeCommissionOnOrder(
  order: DetailingOrderWithServices,
  employeeId: string
): number {
  if (order.status === "cancelled") return 0;

  if (hasServiceLevelAssignments(order.services)) {
    return roundMoney(
      order.services
        .filter((service) => service.assigned_employee_id === employeeId)
        .reduce((sum, service) => sum + (service.commission_amount ?? 0), 0)
    );
  }

  if (order.assigned_employee_id !== employeeId) return 0;

  return roundMoney(
    order.employee_commission_amount ??
      calculateEmployeeCommission(
        order.final_price,
        resolveCommissionPercent(order.employee_commission_percent_snapshot),
        order.status
      )
  );
}

export function isCommissionEarned(order: DetailingOrderWithServices): boolean {
  return order.status === "delivered" && !order.archived_at;
}

export function getCommissionRecognitionDate(
  order: DetailingOrderWithServices
): string | null {
  if (!isCommissionEarned(order)) return null;
  return order.actual_completion_at?.slice(0, 10) ?? null;
}

export function isOrderUnpaidRelevant(
  order: DetailingOrderWithServices,
  employeeId: string
): boolean {
  if (!isOrderRelevantToEmployee(order, employeeId)) return false;
  if (order.status === "cancelled" || order.archived_at) return false;
  return (
    order.payment_status === "unpaid" || order.payment_status === "partially_paid"
  );
}

function scopedOrders(
  orders: DetailingOrderWithServices[],
  employeeId: string
) {
  return orders.filter((order) => isOrderRelevantToEmployee(order, employeeId));
}

function sanitizeOrderForEmployee(
  order: DetailingOrderWithServices,
  employeeId: string
): DetailingOrderWithServices {
  return {
    ...order,
    employee_commission_amount:
      order.assigned_employee_id === employeeId
        ? order.employee_commission_amount
        : null,
    employee_commission_percent_snapshot:
      order.assigned_employee_id === employeeId
        ? order.employee_commission_percent_snapshot
        : null,
    employee_name_snapshot:
      order.assigned_employee_id === employeeId
        ? order.employee_name_snapshot
        : null,
    services: order.services.map((service) => ({
      ...service,
      commission_amount:
        service.assigned_employee_id === employeeId ? service.commission_amount : 0,
      commission_percent_snapshot:
        service.assigned_employee_id === employeeId
          ? service.commission_percent_snapshot
          : null,
      employee_name_snapshot:
        service.assigned_employee_id === employeeId
          ? service.employee_name_snapshot
          : null,
    })),
  };
}

function toDashboardOrder(
  order: DetailingOrderWithServices,
  employeeId: string
): DetailingEmployeeDashboardOrder {
  const sanitized = sanitizeOrderForEmployee(order, employeeId);
  return {
    order: sanitized,
    myCommission: resolveEmployeeCommissionOnOrder(order, employeeId),
    myServices: order.services.filter(
      (service) => service.assigned_employee_id === employeeId
    ),
  };
}

export function getDetailingEmployeeDashboardSummary(input: {
  orders: DetailingOrderWithServices[];
  employeeId: string;
  employeeName: string;
  viewerName: string;
  canSelectEmployee: boolean;
  assigneeOptions: Array<{ id: string; full_name: string }>;
  dateRange: ResolvedDateRange;
  today: string;
}): DetailingEmployeeDashboardData {
  const relevantOrders = scopedOrders(input.orders, input.employeeId);

  const myTasksToday = relevantOrders.filter(
    (order) =>
      order.appointment_date === input.today &&
      (ACTIVE_DETAILING_ORDER_STATUSES.includes(order.status) ||
        order.status === "delivered")
  );

  const inProgress = relevantOrders.filter((order) => order.status === "in_progress");
  const ready = relevantOrders.filter((order) => order.status === "ready");

  const earnedInPeriod = relevantOrders.filter((order) => {
    if (!isCommissionEarned(order)) return false;
    const recognitionDate = getCommissionRecognitionDate(order);
    if (!recognitionDate) return false;
    return isDateWithinRange(
      recognitionDate,
      input.dateRange.from,
      input.dateRange.to
    );
  });

  const myEarnedCommission = roundMoney(
    earnedInPeriod.reduce(
      (sum, order) =>
        sum + resolveEmployeeCommissionOnOrder(order, input.employeeId),
      0
    )
  );

  const unpaidOrders = relevantOrders.filter((order) =>
    isOrderUnpaidRelevant(order, input.employeeId)
  );

  const attention = relevantOrders
    .filter((order) => {
      if (order.archived_at || order.status === "cancelled") return false;
      if (order.status === "ready") return true;
      if (
        order.status === "scheduled" &&
        order.appointment_date < input.today
      ) {
        return true;
      }
      if (
        order.status === "delivered" &&
        (order.payment_status === "unpaid" ||
          order.payment_status === "partially_paid")
      ) {
        return true;
      }
      return false;
    })
    .slice(0, 20);

  const kpis: DetailingEmployeeDashboardKpis = {
    myTasksToday: myTasksToday.length,
    inProgress: inProgress.length,
    ready: ready.length,
    myEarnedCommission,
    unpaidOrders: unpaidOrders.length,
  };

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    viewerName: input.viewerName,
    canSelectEmployee: input.canSelectEmployee,
    assigneeOptions: input.assigneeOptions,
    dateRange: input.dateRange,
    today: input.today,
    kpis,
    todayOrders: myTasksToday.map((order) =>
      toDashboardOrder(order, input.employeeId)
    ),
    attentionOrders: attention.map((order) =>
      toDashboardOrder(order, input.employeeId)
    ),
    earnedOrders: earnedInPeriod.map((order) =>
      toDashboardOrder(order, input.employeeId)
    ),
  };
}
