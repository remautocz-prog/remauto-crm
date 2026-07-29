import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";

export const DATA_SOURCE_MODES = [
  "crm_only",
  "crm_with_manual_overrides",
  "manual_only",
] as const;

export type DataSourceMode = (typeof DATA_SOURCE_MODES)[number];

export const DEFAULT_DATA_SOURCE_BY_CATEGORY: Record<
  DocumentTemplateCategory,
  DataSourceMode
> = {
  vehicle_exchange_agreement: "crm_with_manual_overrides",
  purchase_agreement: "crm_with_manual_overrides",
  handover_protocol: "crm_with_manual_overrides",
  power_of_attorney: "manual_only",
  commission_agreement: "crm_with_manual_overrides",
  invoice_sheet: "crm_with_manual_overrides",
  custom: "manual_only",
};

export function resolveDataSourceMode(
  category: DocumentTemplateCategory,
  storedMode?: string | null
): DataSourceMode {
  if (
    storedMode &&
    DATA_SOURCE_MODES.includes(storedMode as DataSourceMode)
  ) {
    return storedMode as DataSourceMode;
  }
  return DEFAULT_DATA_SOURCE_BY_CATEGORY[category];
}

export const DEAL_TYPE_SUGGESTED_TEMPLATE_CATEGORIES: Record<
  string,
  DocumentTemplateCategory[]
> = {
  vehicle_exchange_with_additional_payment: [
    "vehicle_exchange_agreement",
    "handover_protocol",
  ],
};
