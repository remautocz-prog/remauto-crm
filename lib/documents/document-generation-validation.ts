import type { DataSourceMode } from "@/lib/constants/document-template-data-source";
import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";
import type { DocumentTemplateData } from "@/lib/types/document-templates";

export type CrmDocumentLoadStatus = {
  dealLoaded: boolean;
  customerLoaded: boolean;
  vehicleALoaded: boolean;
  vehicleBLoaded: boolean;
  resolvedPlaceholderCount: number;
};

function countNonEmptyStringValues(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (typeof value !== "object") return 0;

  let count = 0;
  for (const nested of Object.values(value as Record<string, unknown>)) {
    count += countNonEmptyStringValues(nested);
  }
  return count;
}

export function countResolvedPlaceholderValues(data: DocumentTemplateData): number {
  const { _generation_meta: _meta, ...rest } = data as DocumentTemplateData & {
    _generation_meta?: unknown;
  };
  void _meta;
  return countNonEmptyStringValues(rest);
}

export function getCrmDocumentLoadStatus(
  data: DocumentTemplateData,
  dealLoaded: boolean
): CrmDocumentLoadStatus {
  const customerName = data.customer?.full_name ?? data.client?.full_name ?? "";
  const vehicleA =
    data.vehicle_a?.vin?.trim() ||
    data.vehicle_a?.make_model?.trim() ||
    data.vehicle_a?.full_name?.trim() ||
    "";
  const vehicleB =
    data.vehicle_b?.vin?.trim() ||
    data.vehicle_b?.make_model?.trim() ||
    data.vehicle_b?.full_name?.trim() ||
    "";

  return {
    dealLoaded,
    customerLoaded: Boolean(customerName.trim()),
    vehicleALoaded: Boolean(vehicleA),
    vehicleBLoaded: Boolean(vehicleB),
    resolvedPlaceholderCount: countResolvedPlaceholderValues(data),
  };
}

export function hasCoreCrmDocumentData(data: DocumentTemplateData): boolean {
  const dealNumber = data.deal?.number?.trim() ?? "";
  const customerName = data.customer?.full_name?.trim() ?? data.client?.full_name?.trim() ?? "";
  const vehicleA =
    data.vehicle_a?.vin?.trim() ||
    data.vehicle_a?.make_model?.trim() ||
    data.vehicle_a?.full_name?.trim() ||
    "";
  const vehicleB =
    data.vehicle_b?.vin?.trim() ||
    data.vehicle_b?.make_model?.trim() ||
    data.vehicle_b?.full_name?.trim() ||
    "";

  return Boolean(dealNumber && customerName && vehicleA && vehicleB);
}

export function isEditedSnapshotUnloadedEmptyForm(
  base: DocumentTemplateData,
  edited: DocumentTemplateData
): boolean {
  if (!hasCoreCrmDocumentData(base)) return false;
  return !hasCoreCrmDocumentData(edited);
}

export function requiresDealForTemplate(
  category: DocumentTemplateCategory,
  mode: DataSourceMode
): boolean {
  if (mode === "manual_only") return false;
  return (
    category === "vehicle_exchange_agreement" ||
    category === "handover_protocol"
  );
}

export type DocumentGenerationLogContext = {
  templateId: string;
  dealId: string | null;
  templateCategory: DocumentTemplateCategory;
  dataSourceMode: DataSourceMode;
  loadStatus: CrmDocumentLoadStatus;
};

export function logDocumentGenerationContext(context: DocumentGenerationLogContext) {
  if (process.env.NODE_ENV === "production") return;

  console.info("[document-generation]", {
    templateId: context.templateId,
    dealId: context.dealId,
    templateCategory: context.templateCategory,
    dataSourceMode: context.dataSourceMode,
    dealLoaded: context.loadStatus.dealLoaded,
    customerLoaded: context.loadStatus.customerLoaded,
    vehicleALoaded: context.loadStatus.vehicleALoaded,
    vehicleBLoaded: context.loadStatus.vehicleBLoaded,
    resolvedPlaceholderCount: context.loadStatus.resolvedPlaceholderCount,
  });
}
