import {
  DETAILING_ORDER_STATUSES,
  DETAILING_PAYMENT_METHODS,
  DETAILING_VEHICLE_SIZES,
  type DetailingOrderStatus,
} from "@/lib/constants/detailing";
import type { DetailingOrderFormInput } from "@/lib/types/detailing";

export function normalizeDetailingOrderStatus(value: string): DetailingOrderStatus {
  if (DETAILING_ORDER_STATUSES.includes(value as DetailingOrderStatus)) {
    return value as DetailingOrderStatus;
  }
  return "scheduled";
}

export function collectDetailingOrderValidationIssues(
  input: DetailingOrderFormInput
): string[] {
  const issues: string[] = [];

  if (!input.vehicle_make_model?.trim()) {
    issues.push("vehicle_make_model_required");
  }
  if (!input.registration_number?.trim()) {
    issues.push("registration_number_required");
  }
  if (!input.is_internal_vehicle) {
    const hasCustomer =
      input.customer_first_name?.trim() ||
      input.customer_last_name?.trim() ||
      input.customer_phone?.trim();
    if (!hasCustomer) {
      issues.push("customer_required");
    }
  }
  if (!input.appointment_date?.trim()) {
    issues.push("appointment_date_required");
  }
  if (!input.appointment_time?.trim()) {
    issues.push("appointment_time_required");
  }
  if (!input.services?.length) {
    issues.push("services_required");
  }
  if (!DETAILING_VEHICLE_SIZES.includes(input.vehicle_size)) {
    issues.push("vehicle_size_invalid");
  }
  if (input.final_price != null && input.final_price < 0) {
    issues.push("final_price_negative");
  }
  if (input.final_price_override != null && input.final_price_override < 0) {
    issues.push("final_price_negative");
  }
  if (
    input.payment_method &&
    !DETAILING_PAYMENT_METHODS.includes(input.payment_method)
  ) {
    issues.push("payment_method_invalid");
  }

  for (const service of input.services ?? []) {
    if (
      service.commission_percent != null &&
      (service.commission_percent < 0 || service.commission_percent > 100)
    ) {
      issues.push("commission_percent_invalid");
      break;
    }
    if (service.commission_amount != null && service.commission_amount < 0) {
      issues.push("commission_amount_negative");
      break;
    }
    if (
      service.commission_amount != null &&
      service.total_price != null &&
      service.commission_amount > service.total_price
    ) {
      issues.push("commission_exceeds_service_total");
      break;
    }
  }

  return issues;
}

export function collectDetailingDeliverValidationIssues(order: {
  final_price: number;
  confirm_no_employee?: boolean;
}): string[] {
  const issues: string[] = [];
  if (order.final_price == null || order.final_price < 0) {
    issues.push("deliver_final_price_required");
  }
  return issues;
}

export function getCustomerDisplayName(order: {
  customer_first_name?: string | null;
  customer_last_name?: string | null;
}): string {
  const parts = [order.customer_first_name, order.customer_last_name]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.join(" ");
}

export function buildServicesSummary(
  services: Array<{ service_name_snapshot: string; quantity: number }>,
  maxItems = 2
): string {
  if (!services.length) return "";
  const labels = services.map((service) => {
    const name = service.service_name_snapshot.trim();
    return service.quantity > 1 ? `${name} ×${service.quantity}` : name;
  });
  if (labels.length <= maxItems) return labels.join(", ");
  return `${labels.slice(0, maxItems).join(", ")} +${labels.length - maxItems}`;
}
