import {
  DOCUMENT_SERVICE_CATALOG,
  DOCUMENT_SERVICE_CATEGORIES,
  DOCUMENT_SERVICE_TYPE_VALUES,
  LEGACY_DOCUMENT_SERVICE_TYPE_VALUES,
  type DocumentServiceCategory,
  type DocumentServiceType,
  type LegacyDocumentServiceType,
} from "@/lib/constants/documents";

/** Maps legacy stored codes to canonical i18n / checklist keys. */
export const LEGACY_DOCUMENT_SERVICE_LABEL_KEYS: Record<
  LegacyDocumentServiceType,
  DocumentServiceType
> = {
  czech_registration: "cz_registration",
  evidence_kontrola: "evidence_check",
  export_documents: "non_eu_export_documents",
  replacement_registration: "duplicate_registration_certificate",
  registration_plates: "new_plates",
  coc_technical: "coc",
  insurance_assistance: "insurance",
  customs_import: "vehicle_import",
};

const CANONICAL_SET = new Set<string>(DOCUMENT_SERVICE_TYPE_VALUES);
const LEGACY_SET = new Set<string>(LEGACY_DOCUMENT_SERVICE_TYPE_VALUES);

export function isCanonicalDocumentServiceType(
  value: string | null | undefined
): value is DocumentServiceType {
  return Boolean(value && CANONICAL_SET.has(value));
}

export function isLegacyDocumentServiceType(
  value: string | null | undefined
): value is LegacyDocumentServiceType {
  return Boolean(value && LEGACY_SET.has(value));
}

export function isKnownDocumentServiceType(value: string | null | undefined): boolean {
  if (!value) return false;
  return isCanonicalDocumentServiceType(value) || isLegacyDocumentServiceType(value) || value === "custom";
}

/** Resolves a stored code to the translation/checklist key (canonical). */
export function resolveDocumentServiceLabelKey(value: string): string {
  if (isLegacyDocumentServiceType(value)) {
    return LEGACY_DOCUMENT_SERVICE_LABEL_KEYS[value];
  }
  return value;
}

export function getGroupedDocumentServices(): Record<
  DocumentServiceCategory,
  readonly DocumentServiceType[]
> {
  return DOCUMENT_SERVICE_CATALOG;
}

export function getAllFilterableServiceCodes(): string[] {
  return [...DOCUMENT_SERVICE_TYPE_VALUES, ...LEGACY_DOCUMENT_SERVICE_TYPE_VALUES];
}

export function filterGroupedServices(
  query: string,
  options?: { includeLegacy?: readonly string[] }
): Record<DocumentServiceCategory, DocumentServiceType[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const result = {} as Record<DocumentServiceCategory, DocumentServiceType[]>;

  for (const category of DOCUMENT_SERVICE_CATEGORIES) {
    result[category] = DOCUMENT_SERVICE_CATALOG[category].filter((code) => {
      if (!normalizedQuery) return true;
      return (
        code.toLowerCase().includes(normalizedQuery) ||
        code.replaceAll("_", " ").toLowerCase().includes(normalizedQuery)
      );
    }) as DocumentServiceType[];
  }

  return result;
}

export function getLegacyServicesForDisplay(
  codes: readonly string[]
): LegacyDocumentServiceType[] {
  return codes.filter(isLegacyDocumentServiceType);
}
