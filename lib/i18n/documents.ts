import type { DocumentTaskStatus } from "@/lib/constants/documents";
import { resolveDocumentServiceLabelKey } from "@/lib/documents/services";
import { isDocumentTaskStatus, normalizeDocumentTaskStatus } from "@/lib/documents/status";
import type { ChecklistItemKey } from "@/lib/documents/checklists";

type ServiceTranslator = (key: string) => string;
type StatusTranslator = (key: DocumentTaskStatus) => string;
type PriorityTranslator = (key: "low" | "normal" | "high" | "urgent") => string;
type PaymentStatusTranslator = (key: "unpaid" | "partially_paid" | "paid") => string;

/** Adapts next-intl service translator to accept dynamic/legacy keys. */
export function bindDocumentServiceTranslator(
  t: (key: never) => string
): ServiceTranslator {
  return (key) => t(key as never);
}

export function translateDocumentService(
  t: ServiceTranslator,
  value: string | null | undefined
) {
  if (!value) return "";
  const labelKey = resolveDocumentServiceLabelKey(value);
  const translated = t(labelKey);
  if (translated !== labelKey) return translated;
  if (value !== labelKey) {
    const legacyTranslated = t(value);
    if (legacyTranslated !== value) return legacyTranslated;
  }
  return value.replaceAll("_", " ");
}

export function translateDocumentStatus(
  t: StatusTranslator,
  value: DocumentTaskStatus | string
) {
  const normalized = normalizeDocumentTaskStatus(value);
  if (isDocumentTaskStatus(normalized)) {
    return t(normalized);
  }
  return value;
}

export function translateDocumentPriority(
  t: PriorityTranslator,
  value: string | null | undefined
) {
  if (value === "low" || value === "normal" || value === "high" || value === "urgent") {
    return t(value);
  }
  return value ?? "";
}

export function translateDocumentPaymentStatus(
  t: PaymentStatusTranslator,
  value: string | null | undefined
) {
  if (value === "unpaid" || value === "partially_paid" || value === "paid") {
    return t(value);
  }
  return value ?? "";
}

export function translateChecklistItem(
  t: (key: string) => string,
  item: {
  key: string;
  label?: string;
}) {
  if (item.label?.trim()) return item.label.trim();
  return t(item.key);
}
