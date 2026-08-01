import type { DetailingOrder, DetailingOrderService } from "@/lib/types/detailing";
import { hasServiceLevelAssignments } from "@/lib/detailing/commission";

export function buildOrderEmployeeNames(
  order: Pick<DetailingOrder, "employee_name_snapshot">,
  services: DetailingOrderService[]
): string {
  if (hasServiceLevelAssignments(services)) {
    const names = [
      ...new Set(
        services
          .map((service) => service.employee_name_snapshot?.trim())
          .filter((name): name is string => Boolean(name))
      ),
    ];
    if (names.length) return names.join(", ");
  }

  return order.employee_name_snapshot?.trim() || "—";
}
