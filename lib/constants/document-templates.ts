export const DOCUMENT_TEMPLATE_CATEGORIES = [
  "purchase_agreement",
  "handover_protocol",
  "power_of_attorney",
  "commission_agreement",
  "invoice_sheet",
  "vehicle_exchange_agreement",
  "custom",
] as const;

export type DocumentTemplateCategory =
  (typeof DOCUMENT_TEMPLATE_CATEGORIES)[number];

export const DOCUMENT_TEMPLATE_LANGUAGES = ["ru", "cs", "en"] as const;

export type DocumentTemplateLanguage =
  (typeof DOCUMENT_TEMPLATE_LANGUAGES)[number];

export const DOCUMENT_TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_STORAGE_BUCKETS = {
  templates: "document-templates",
  generated: "generated-documents",
} as const;

export const PDF_GENERATION_ENABLED = false;
