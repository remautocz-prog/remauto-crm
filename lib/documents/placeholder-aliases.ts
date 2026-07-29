import type { DocumentTemplateData } from "@/lib/types/document-templates";

/** Legacy placeholder inner names mapped to canonical dot-notation paths. */
export const PLACEHOLDER_ALIASES: Record<string, string> = {
  dealNumber: "deal.number",
  dealService_budget_formatted: "service.approved_budget_formatted",
  "deal.service_budget_formatted": "service.approved_budget_formatted",
  companyIco: "company.ico",
  companyAddress: "company.address",
  companyBank_account: "company.bank_account",
  companyEmail: "company.email",
  companyPhone: "company.phone",
  companyRepresentative: "company.representative",
  customerFull_name: "customer.full_name",
  customerAddress: "customer.address",
  customerBank_account: "customer.bank_account",
  customerBirth_date_or_ico: "customer.birth_date_or_ico",
  customerDocument_number: "customer.document_number",
  customerEmail: "customer.email",
  customerPhone: "customer.phone",
  "payment.other_method": "payment.other_text",
  "handover.date": "handover.delivery_date",
  "handover.place": "handover.delivery_place",
};

export function normalizePlaceholderInnerName(name: string): string {
  return name.trim();
}

export function resolvePlaceholderInnerName(name: string): string {
  const normalized = normalizePlaceholderInnerName(name);
  return PLACEHOLDER_ALIASES[normalized] ?? normalized;
}

export function resolvePlaceholderCode(code: string): string {
  const inner = code.startsWith("{{") && code.endsWith("}}")
    ? code.slice(2, -2)
    : code;
  const canonical = resolvePlaceholderInnerName(inner);
  return `{{${canonical}}}`;
}

export function isKnownPlaceholderCode(code: string, knownCodes: Set<string>): boolean {
  if (knownCodes.has(code)) return true;
  return knownCodes.has(resolvePlaceholderCode(code));
}

function getNestedValue(
  data: DocumentTemplateData,
  path: string
): string {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return current == null ? "" : String(current);
}

export function applyLegacyPlaceholderAliases(
  data: DocumentTemplateData
): DocumentTemplateData {
  const flatLegacy: Record<string, string> = {};
  const deal = { ...(data.deal ?? {}) };
  const payment = { ...(data.payment ?? {}) };
  const handover = { ...(data.handover ?? {}) } as Record<string, unknown>;

  for (const [legacyKey, canonicalPath] of Object.entries(PLACEHOLDER_ALIASES)) {
    const value = getNestedValue(data, canonicalPath);
    if (legacyKey.includes(".")) {
      const [section, field] = legacyKey.split(".", 2);
      if (section === "deal") deal[field] = value;
      if (section === "payment") payment[field] = value;
      if (section === "handover") handover[field] = value;
    } else {
      flatLegacy[legacyKey] = value;
    }
  }

  if (data.payment) {
    payment.other_method = payment.other_method || payment.other_text || "";
  }
  if (data.handover) {
    handover.date =
      (typeof handover.date === "string" && handover.date) ||
      (typeof handover.delivery_date === "string" ? handover.delivery_date : "") ||
      "";
    handover.place =
      (typeof handover.place === "string" && handover.place) ||
      (typeof handover.delivery_place === "string" ? handover.delivery_place : "") ||
      "";
  }

  return {
    ...data,
    ...flatLegacy,
    deal: data.deal ? deal : data.deal,
    payment: data.payment ? payment : data.payment,
    handover: data.handover ? (handover as DocumentTemplateData["handover"]) : data.handover,
  } as DocumentTemplateData;
}
