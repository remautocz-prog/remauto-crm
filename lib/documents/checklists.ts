import type { ChecklistItem } from "@/lib/types/documents";
import {
  LEGACY_DOCUMENT_SERVICE_LABEL_KEYS,
  resolveDocumentServiceLabelKey,
} from "@/lib/documents/services";

export const CHECKLIST_ITEM_KEYS = [
  "foreign_registration_certificate",
  "purchase_agreement",
  "coc_technical_documentation",
  "identification_document",
  "power_of_attorney",
  "insurance_confirmation",
  "stk_protocol",
  "registration_certificate",
  "identification_documents",
  "evidence_kontrola",
  "title",
  "bill_of_sale",
  "customs_documents",
  "shipping_documents",
  "technical_data",
  "stk_import_inspection",
  "insurance",
  "lease_contract",
  "export_declaration",
  "vin_report",
  "police_report",
] as const;

export type ChecklistItemKey = (typeof CHECKLIST_ITEM_KEYS)[number];

const REGISTRATION_BASE: ChecklistItemKey[] = [
  "foreign_registration_certificate",
  "purchase_agreement",
  "coc_technical_documentation",
  "identification_document",
  "power_of_attorney",
  "insurance_confirmation",
  "stk_protocol",
];

const EU_REGISTRATION: ChecklistItemKey[] = [
  "foreign_registration_certificate",
  "purchase_agreement",
  "coc_technical_documentation",
  "identification_document",
  "power_of_attorney",
  "insurance_confirmation",
];

const USA_CANADA_REGISTRATION: ChecklistItemKey[] = [
  "title",
  "bill_of_sale",
  "customs_documents",
  "shipping_documents",
  "technical_data",
  "stk_import_inspection",
  "insurance",
  "power_of_attorney",
];

const PLATES_BASE: ChecklistItemKey[] = [
  "registration_certificate",
  "identification_document",
  "insurance_confirmation",
  "power_of_attorney",
];

const CUSTOMS_BASE: ChecklistItemKey[] = [
  "customs_documents",
  "purchase_agreement",
  "technical_data",
  "power_of_attorney",
];

/** Checklist templates keyed by canonical service code (and legacy codes). */
const SERVICE_CHECKLIST_TEMPLATES: Record<string, ChecklistItemKey[]> = {
  cz_registration: REGISTRATION_BASE,
  eu_registration: EU_REGISTRATION,
  usa_canada_registration: USA_CANADA_REGISTRATION,
  ownership_transfer: [
    "registration_certificate",
    "purchase_agreement",
    "identification_documents",
    "power_of_attorney",
    "evidence_kontrola",
    "insurance_confirmation",
  ],
  temporary_protection_registration: [
    ...REGISTRATION_BASE,
    "identification_documents",
  ],
  registration_data_change: [
    "registration_certificate",
    "identification_document",
    "power_of_attorney",
    "insurance_confirmation",
  ],
  post_lease_registration: [
    "registration_certificate",
    "lease_contract",
    "identification_document",
    "power_of_attorney",
    "insurance_confirmation",
    "stk_protocol",
  ],
  stk: ["registration_certificate", "identification_document", "insurance_confirmation"],
  import_stk: [
    "customs_documents",
    "technical_data",
    "identification_document",
    "insurance_confirmation",
  ],
  evidence_check: [
    "registration_certificate",
    "identification_document",
    "insurance_confirmation",
  ],
  emissions_check: [
    "registration_certificate",
    "identification_document",
    "stk_protocol",
  ],
  individual_approval: [
    "technical_data",
    "coc_technical_documentation",
    "identification_document",
  ],
  technical_data: ["technical_data", "registration_certificate", "identification_document"],
  coc: ["coc_technical_documentation", "technical_data"],
  post_repair_inspection: [
    "registration_certificate",
    "stk_protocol",
    "identification_document",
  ],
  new_plates: PLATES_BASE,
  duplicate_plate: [
    "registration_certificate",
    "identification_document",
    "power_of_attorney",
  ],
  duplicate_registration_certificate: [
    "identification_document",
    "power_of_attorney",
    "insurance_confirmation",
  ],
  lost_documents: [
    "identification_document",
    "power_of_attorney",
    "police_report",
  ],
  export_plates: PLATES_BASE,
  transit_plates: PLATES_BASE,
  custom_plates: [
    "registration_certificate",
    "identification_document",
    "insurance_confirmation",
  ],
  damaged_plates_replacement: [
    "registration_certificate",
    "identification_document",
    "insurance_confirmation",
  ],
  customs_clearance: CUSTOMS_BASE,
  customs_vat: ["customs_documents", "purchase_agreement", "identification_document"],
  mrn: ["customs_documents", "shipping_documents", "registration_certificate"],
  vehicle_export: [
    "registration_certificate",
    "customs_documents",
    "export_declaration",
    "power_of_attorney",
    "identification_document",
  ],
  vehicle_import: CUSTOMS_BASE,
  non_eu_export_documents: [
    "registration_certificate",
    "identification_document",
    "power_of_attorney",
    "customs_documents",
  ],
  transport_logistics: ["shipping_documents", "registration_certificate", "identification_document"],
  document_precheck: [
    "purchase_agreement",
    "technical_data",
    "registration_certificate",
    "vin_report",
  ],
  insurance: ["identification_document", "registration_certificate", "insurance"],
  power_of_attorney: ["identification_document", "power_of_attorney"],
  purchase_agreement: ["purchase_agreement", "identification_document", "registration_certificate"],
  contract_preparation: ["purchase_agreement", "identification_document"],
  vin_check: ["vin_report", "registration_certificate", "identification_document"],
  registry_extract: ["identification_document", "registration_certificate", "power_of_attorney"],
  custom: [],
  // Legacy stored codes (preserve checklist behavior for existing rows)
  czech_registration: REGISTRATION_BASE,
  evidence_kontrola: [
    "registration_certificate",
    "identification_document",
    "insurance_confirmation",
  ],
  export_documents: [
    "registration_certificate",
    "identification_document",
    "power_of_attorney",
  ],
  replacement_registration: [
    "identification_document",
    "power_of_attorney",
    "insurance_confirmation",
  ],
  registration_plates: [
    "registration_certificate",
    "identification_document",
    "insurance_confirmation",
  ],
  coc_technical: ["coc_technical_documentation", "technical_data"],
  insurance_assistance: ["identification_document", "registration_certificate"],
  customs_import: CUSTOMS_BASE,
};

export function buildChecklistForService(
  serviceType: string | null | undefined
): ChecklistItem[] {
  if (!serviceType || serviceType === "custom") return [];
  const canonicalKey = resolveDocumentServiceLabelKey(serviceType);
  const keys =
    SERVICE_CHECKLIST_TEMPLATES[serviceType] ??
    SERVICE_CHECKLIST_TEMPLATES[canonicalKey] ??
    [];
  return keys.map((key) => ({ key }));
}

export function parseChecklistJson(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  const items: ChecklistItem[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      items.push({ key: item });
      continue;
    }
    if (item && typeof item === "object" && "key" in item) {
      const row = item as ChecklistItem;
      if (!row.key) continue;
      items.push({
        key: String(row.key),
        ...(row.custom ? { custom: true } : {}),
        ...(row.label ? { label: row.label } : {}),
      });
    }
  }
  return items;
}

export function getReceivedKeys(received: ChecklistItem[]): Set<string> {
  return new Set(received.map((item) => item.key));
}

export function toggleChecklistItem(
  required: ChecklistItem[],
  received: ChecklistItem[],
  key: string,
  checked: boolean
): ChecklistItem[] {
  const without = received.filter((item) => item.key !== key);
  if (!checked) return without;
  const requiredItem = required.find((item) => item.key === key);
  return [...without, requiredItem ?? { key }];
}

export function getChecklistProgress(required: ChecklistItem[], received: ChecklistItem[]) {
  const receivedKeys = getReceivedKeys(received);
  const total = required.length;
  const done = required.filter((item) => receivedKeys.has(item.key)).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}

export function getMissingChecklistItems(
  required: ChecklistItem[],
  received: ChecklistItem[]
) {
  const receivedKeys = getReceivedKeys(received);
  return required.filter((item) => !receivedKeys.has(item.key));
}

// Re-export for tests / diagnostics
export { LEGACY_DOCUMENT_SERVICE_LABEL_KEYS };
