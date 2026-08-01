import {
  calculateEmployeeCommission,
  hasServiceLevelAssignments,
  resolveCommissionPercent,
} from "@/lib/detailing/commission";
import { roundMoney } from "@/lib/detailing/pricing";
import type { DetailingOrder, DetailingOrderWithServices } from "@/lib/types/detailing";

export type EmployeeCommissionAggregate = {
  employeeId: string | null;
  employeeName: string;
  assignedServices: number;
  deliveredOrderIds: Set<string>;
  revenueGenerated: number;
  commissionPercent: number;
  commissionPayable: number;
};

function emptyAggregate(
  employeeId: string | null,
  employeeName: string,
  commissionPercent = 35
): EmployeeCommissionAggregate {
  return {
    employeeId,
    employeeName,
    assignedServices: 0,
    deliveredOrderIds: new Set<string>(),
    revenueGenerated: 0,
    commissionPercent,
    commissionPayable: 0,
  };
}

function addToAggregate(
  map: Map<string, EmployeeCommissionAggregate>,
  key: string,
  employeeId: string | null,
  employeeName: string,
  orderId: string,
  serviceRevenue: number,
  serviceCommission: number,
  commissionPercent: number
) {
  const existing =
    map.get(key) ??
    emptyAggregate(employeeId, employeeName, commissionPercent);

  existing.assignedServices += 1;
  existing.deliveredOrderIds.add(orderId);
  existing.revenueGenerated = roundMoney(existing.revenueGenerated + serviceRevenue);
  existing.commissionPayable = roundMoney(existing.commissionPayable + serviceCommission);
  existing.commissionPercent = commissionPercent;
  if (!existing.employeeName || existing.employeeName === "—") {
    existing.employeeName = employeeName;
  }

  map.set(key, existing);
}

export function aggregateEmployeeCommissionsFromOrders(
  orders: DetailingOrderWithServices[]
): Map<string, EmployeeCommissionAggregate> {
  const map = new Map<string, EmployeeCommissionAggregate>();

  for (const order of orders) {
    if (order.status !== "delivered") continue;

    if (hasServiceLevelAssignments(order.services)) {
      for (const service of order.services) {
        if (!service.assigned_employee_id) continue;

        const key = service.assigned_employee_id;
        addToAggregate(
          map,
          key,
          service.assigned_employee_id,
          service.employee_name_snapshot ?? "—",
          order.id,
          service.total_price,
          service.commission_amount,
          service.commission_percent_snapshot ?? 35
        );
      }
      continue;
    }

    if (!order.assigned_employee_id) continue;

    const key = order.assigned_employee_id;
    const commission = roundMoney(
      order.employee_commission_amount ??
        calculateEmployeeCommission(
          order.final_price,
          resolveCommissionPercent(order.employee_commission_percent_snapshot),
          order.status
        )
    );

    addToAggregate(
      map,
      key,
      order.assigned_employee_id,
      order.employee_name_snapshot ?? "—",
      order.id,
      order.final_price,
      commission,
      order.employee_commission_percent_snapshot ?? 35
    );
  }

  return map;
}

export function sumDeliveredOrderCommissions(orders: DetailingOrderWithServices[]): number {
  return roundMoney(
    orders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => {
        if (hasServiceLevelAssignments(order.services)) {
          return (
            sum +
            order.services.reduce(
              (serviceSum, service) => serviceSum + (service.commission_amount ?? 0),
              0
            )
          );
        }

        return (
          sum +
          (order.employee_commission_amount ??
            calculateEmployeeCommission(
              order.final_price,
              resolveCommissionPercent(order.employee_commission_percent_snapshot),
              order.status
            ))
        );
      }, 0)
  );
}

export function toEmployeeSummaryRows(map: Map<string, EmployeeCommissionAggregate>) {
  return Array.from(map.values())
    .map((entry) => ({
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      assignedServices: entry.assignedServices,
      deliveredOrders: entry.deliveredOrderIds.size,
      revenueGenerated: entry.revenueGenerated,
      commissionPercent: entry.commissionPercent,
      commissionPayable: entry.commissionPayable,
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function resolveOrderCommissionTotal(order: DetailingOrderWithServices): number {
  if (order.status === "cancelled") return 0;

  if (hasServiceLevelAssignments(order.services)) {
    return roundMoney(
      order.services.reduce((sum, service) => sum + (service.commission_amount ?? 0), 0)
    );
  }

  return roundMoney(
    order.employee_commission_amount ??
      calculateEmployeeCommission(
        order.final_price,
        resolveCommissionPercent(order.employee_commission_percent_snapshot),
        order.status
      )
  );
}
