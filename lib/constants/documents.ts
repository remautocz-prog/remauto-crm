export const DOCUMENT_SERVICE_CATEGORIES = [
  "registration",
  "technical",
  "plates_and_documents",
  "import_export",
  "other",
] as const;

export type DocumentServiceCategory = (typeof DOCUMENT_SERVICE_CATEGORIES)[number];

/** Canonical RemAuto document service codes (language-independent). */
export const DOCUMENT_SERVICE_CATALOG: Record<
  DocumentServiceCategory,
  readonly string[]
> = {
  registration: [
    "cz_registration",
    "eu_registration",
    "usa_canada_registration",
    "ownership_transfer",
    "temporary_protection_registration",
    "registration_data_change",
    "post_lease_registration",
  ],
  technical: [
    "stk",
    "import_stk",
    "evidence_check",
    "emissions_check",
    "individual_approval",
    "technical_data",
    "coc",
    "post_repair_inspection",
  ],
  plates_and_documents: [
    "new_plates",
    "duplicate_plate",
    "duplicate_registration_certificate",
    "lost_documents",
    "export_plates",
    "transit_plates",
    "custom_plates",
    "damaged_plates_replacement",
  ],
  import_export: [
    "customs_clearance",
    "customs_vat",
    "mrn",
    "vehicle_export",
    "vehicle_import",
    "non_eu_export_documents",
    "transport_logistics",
    "document_precheck",
  ],
  other: [
    "insurance",
    "power_of_attorney",
    "purchase_agreement",
    "contract_preparation",
    "vin_check",
    "registry_extract",
    "custom",
  ],
} as const;

export const DOCUMENT_SERVICE_TYPE_VALUES = [
  ...DOCUMENT_SERVICE_CATALOG.registration,
  ...DOCUMENT_SERVICE_CATALOG.technical,
  ...DOCUMENT_SERVICE_CATALOG.plates_and_documents,
  ...DOCUMENT_SERVICE_CATALOG.import_export,
  ...DOCUMENT_SERVICE_CATALOG.other,
] as const;

export type DocumentServiceType = (typeof DOCUMENT_SERVICE_TYPE_VALUES)[number];

/** Legacy codes that may still exist in stored document_tasks rows. */
export const LEGACY_DOCUMENT_SERVICE_TYPE_VALUES = [
  "czech_registration",
  "evidence_kontrola",
  "export_documents",
  "replacement_registration",
  "registration_plates",
  "coc_technical",
  "insurance_assistance",
  "customs_import",
] as const;

export type LegacyDocumentServiceType =
  (typeof LEGACY_DOCUMENT_SERVICE_TYPE_VALUES)[number];

export const DOCUMENT_TASK_STATUS_VALUES = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_OFFICE",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type DocumentTaskStatus = (typeof DOCUMENT_TASK_STATUS_VALUES)[number];

export const DOCUMENT_PRIORITY_VALUES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type DocumentPriority = (typeof DOCUMENT_PRIORITY_VALUES)[number];

export const DOCUMENT_PAYMENT_STATUS_VALUES = [
  "unpaid",
  "partially_paid",
  "paid",
] as const;

export type DocumentPaymentStatus = (typeof DOCUMENT_PAYMENT_STATUS_VALUES)[number];

export const DOCUMENT_SORT_VALUES = [
  "newest",
  "oldest",
  "closest_deadline",
  "overdue_first",
  "highest_price",
  "client_name",
] as const;

export type DocumentSortValue = (typeof DOCUMENT_SORT_VALUES)[number];

export const OPEN_DOCUMENT_TASK_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_OFFICE",
] as const;

export const ACTIVE_DOCUMENT_TASK_STATUSES = [
  ...OPEN_DOCUMENT_TASK_STATUSES,
] as const;

export const COMPLETED_DOCUMENT_TASK_STATUSES = [
  "COMPLETED",
  "DELIVERED",
] as const;

export const TERMINAL_DOCUMENT_TASK_STATUSES = [
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const KANBAN_DOCUMENT_STATUSES = [
  ...DOCUMENT_TASK_STATUS_VALUES,
] as const;

export const DEFAULT_DOCUMENT_STATUS: DocumentTaskStatus = "NEW";
export const DEFAULT_DOCUMENT_PRIORITY: DocumentPriority = "normal";
export const DEFAULT_DOCUMENT_PAYMENT_STATUS: DocumentPaymentStatus = "unpaid";

export const PAYMENT_METHOD_VALUES = [
  "cash",
  "bank_transfer",
  "card",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];
