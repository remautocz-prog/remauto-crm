import type {
  DocumentTaskDbPayload,
  DocumentTaskFormInput,
  DocumentStatusChangeInput,
  DocumentTaskServiceFormInput,
} from "@/lib/types/documents";
import {
  DEFAULT_DOCUMENT_PRIORITY,
  DEFAULT_DOCUMENT_STATUS,
  DOCUMENT_TASK_STATUS_VALUES,
} from "@/lib/constants/documents";
import { normalizeChecklistForPayload } from "@/lib/documents/helpers";
import { buildChecklistForService } from "@/lib/documents/checklists";
import { buildPaymentFields, canMarkPaidInFull, resolveFormPaidAmount } from "@/lib/documents/payment";
import {
  calculateServiceTotals,
  derivePrimaryServiceType,
  normalizeServiceFormRows,
} from "@/lib/documents/task-services";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { type DocumentVehicleMode } from "@/lib/documents/vehicle";

export type DocumentField =
  | keyof DocumentTaskFormInput
  | "confirmOverpayment"
  | "paid_in_full"
  | `services.${number}.service_name`
  | `services.${number}.service_price`
  | `services.${number}.cost_price`;

export type DocumentValidationMessageKey =
  | "clientRequired"
  | "serviceTypeRequired"
  | "customServiceRequired"
  | "dueDateBeforeStart"
  | "paidAmountNegative"
  | "paidAmountExceedsPrice"
  | "servicePriceInvalid"
  | "servicePriceNegative"
  | "costPriceInvalid"
  | "paidInFullRequiresPrice"
  | "atLeastOneServiceRequired"
  | "serviceNameRequired"
  | "serviceRowPriceNegative"
  | "serviceRowCostNegative"
  | "statusRequired"
  | "deliveredRequiresCompleted"
  | "deliveredUnpaidWarning";

export type DocumentValidationIssue = {
  field: DocumentField;
  messageKey: DocumentValidationMessageKey;
};

export type DocumentFieldErrors = Partial<Record<DocumentField, string>>;

export function isBlankString(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

export function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeOptionalNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeOptionalDate(value: string | null | undefined): string | null {
  return normalizeOptionalString(value);
}

function mergeChecklistsForServices(services: DocumentTaskServiceFormInput[]) {
  const merged: ReturnType<typeof buildChecklistForService> = [];
  const seen = new Set<string>();

  for (const service of services) {
    if (!service.service_code || service.service_code === "custom") continue;
    for (const item of buildChecklistForService(service.service_code)) {
      if (!seen.has(item.key)) {
        seen.add(item.key);
        merged.push(item);
      }
    }
  }

  return merged;
}

export function collectDocumentValidationIssues(
  input: DocumentTaskFormInput,
  options?: { confirmOverpayment?: boolean }
): DocumentValidationIssue[] {
  const issues: DocumentValidationIssue[] = [];

  if (!input.client_id) {
    issues.push({ field: "client_id", messageKey: "clientRequired" });
  }

  const services = normalizeServiceFormRows(input.services);
  const nonEmptyServices = services.filter((service) => service.service_name.trim());

  if (nonEmptyServices.length === 0) {
    issues.push({ field: "services.0.service_name", messageKey: "atLeastOneServiceRequired" });
  }

  services.forEach((service, index) => {
    const hasAnyValue =
      service.service_name.trim() ||
      service.service_price > 0 ||
      service.cost_price > 0 ||
      service.notes;

    if (hasAnyValue && !service.service_name.trim()) {
      issues.push({
        field: `services.${index}.service_name`,
        messageKey: "serviceNameRequired",
      });
    }

    if (Number(service.service_price) < 0) {
      issues.push({
        field: `services.${index}.service_price`,
        messageKey: "serviceRowPriceNegative",
      });
    }

    if (Number(service.cost_price) < 0) {
      issues.push({
        field: `services.${index}.cost_price`,
        messageKey: "serviceRowCostNegative",
      });
    }
  });

  const startedAt = normalizeOptionalDate(input.started_at);
  const dueDate = normalizeOptionalDate(input.due_date);
  if (startedAt && dueDate && dueDate < startedAt) {
    issues.push({ field: "due_date", messageKey: "dueDateBeforeStart" });
  }

  const totals = calculateServiceTotals(nonEmptyServices);
  const servicePrice = totals.totalServicePrice;
  const paidAmount = resolveFormPaidAmount({
    servicePrice,
    paidAmount: normalizeOptionalNumber(input.paid_amount) ?? 0,
    paidInFull: input.paid_in_full,
  });

  if (input.paid_in_full && !canMarkPaidInFull(servicePrice)) {
    issues.push({ field: "paid_in_full", messageKey: "paidInFullRequiresPrice" });
  }
  if (paidAmount < 0) {
    issues.push({ field: "paid_amount", messageKey: "paidAmountNegative" });
  }
  if (
    servicePrice > 0 &&
    paidAmount > servicePrice &&
    !options?.confirmOverpayment
  ) {
    issues.push({ field: "paid_amount", messageKey: "paidAmountExceedsPrice" });
  }

  return issues;
}

export function collectStatusChangeIssues(
  currentStatus: string,
  input: DocumentStatusChangeInput,
  finance: { paymentStatus: string; outstandingBalance: number }
): DocumentValidationIssue[] {
  const issues: DocumentValidationIssue[] = [];
  const normalizedCurrent = normalizeDocumentTaskStatus(currentStatus);
  const normalizedInput = normalizeDocumentTaskStatus(input.status);

  if (!DOCUMENT_TASK_STATUS_VALUES.includes(normalizedInput)) {
    issues.push({ field: "status", messageKey: "statusRequired" });
  }

  if (
    normalizedInput === "DELIVERED" &&
    normalizedCurrent !== "COMPLETED" &&
    normalizedCurrent !== "DELIVERED"
  ) {
    issues.push({ field: "status", messageKey: "deliveredRequiresCompleted" });
  }

  if (
    normalizedInput === "DELIVERED" &&
    finance.paymentStatus !== "paid" &&
    finance.outstandingBalance > 0 &&
    !input.confirmUnpaidDelivery
  ) {
    issues.push({ field: "status", messageKey: "deliveredUnpaidWarning" });
  }

  return issues;
}

/** Maps form values to a Supabase-safe document_tasks payload (legacy work_type included). */
export function mapDocumentTaskPayload(input: DocumentTaskFormInput): DocumentTaskDbPayload {
  const services = normalizeServiceFormRows(input.services).filter((service) =>
    service.service_name.trim()
  );
  const totals = calculateServiceTotals(services);
  const servicePrice = totals.totalServicePrice;
  const costPrice = totals.totalCostPrice;
  const primaryService = derivePrimaryServiceType(services);
  const serviceType = primaryService.service_type;
  const paidAmount = resolveFormPaidAmount({
    servicePrice,
    paidAmount: normalizeOptionalNumber(input.paid_amount) ?? 0,
    paidInFull: input.paid_in_full,
  });
  const documentCount = normalizeOptionalNumber(input.document_count) ?? 0;

  const payment = buildPaymentFields({
    servicePrice,
    paidAmount,
    paidInFull: input.paid_in_full,
    paymentMethod: input.payment_method ?? null,
  });

  const mergedChecklist = mergeChecklistsForServices(services);
  const requiredDocuments =
    input.required_documents?.length && input.required_documents.length > 0
      ? normalizeChecklistForPayload(input.required_documents)
      : mergedChecklist;

  const vehicleMode: DocumentVehicleMode =
    input.vehicle_mode === "crm" ? "crm" : "external";

  const shared = {
    client_id: input.client_id!,
    service_type: serviceType,
    work_type: serviceType,
    custom_service_name:
      serviceType === "custom"
        ? primaryService.custom_service_name ??
          services[0]?.service_name.trim() ??
          null
        : null,
    assigned_to: normalizeOptionalString(input.assigned_to ?? null),
    status: normalizeDocumentTaskStatus(input.status ?? DEFAULT_DOCUMENT_STATUS),
    priority: input.priority ?? DEFAULT_DOCUMENT_PRIORITY,
    started_at: normalizeOptionalDate(input.started_at),
    due_date: normalizeOptionalDate(input.due_date),
    service_price: servicePrice,
    cost_price: costPrice,
    paid_amount: payment.paid_amount,
    payment_status: payment.payment_status,
    paid_at: payment.paid_at,
    payment_method: payment.payment_method,
    document_count: documentCount || requiredDocuments.length,
    required_documents: requiredDocuments,
    received_documents: normalizeChecklistForPayload(input.received_documents),
    notes: normalizeOptionalString(input.notes),
    result_notes: normalizeOptionalString(input.result_notes),
  };

  if (vehicleMode === "crm") {
    return {
      ...shared,
      vehicle_mode: "crm",
      car_id: input.car_id ?? null,
      vehicle_vin: null,
      vehicle_plate: null,
      vehicle_brand: null,
      vehicle_model: null,
      vehicle_year: null,
    };
  }

  return {
    ...shared,
    vehicle_mode: "external",
    car_id: null,
    vehicle_vin: normalizeOptionalString(input.vehicle_vin),
    vehicle_plate: normalizeOptionalString(input.vehicle_plate),
    vehicle_brand: normalizeOptionalString(input.vehicle_brand),
    vehicle_model: normalizeOptionalString(input.vehicle_model),
    vehicle_year: normalizeOptionalNumber(input.vehicle_year),
  };
}

/** @deprecated Use mapDocumentTaskPayload */
export const normalizeDocumentPayload = mapDocumentTaskPayload;

export function focusFirstFieldError(fieldErrors: DocumentFieldErrors) {
  const firstField = Object.keys(fieldErrors)[0];
  if (!firstField) return;
  const element =
    document.getElementById(`document_${firstField}`) ??
    document.querySelector(`[data-field="${firstField}"]`);
  if (element instanceof HTMLElement) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
  }
}

export { normalizeServiceFormRows };
