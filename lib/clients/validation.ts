import { DEFAULT_CLIENT_TYPE } from "@/lib/constants/clients";
import type { ClientFormInput } from "@/lib/types/clients";

export type ClientField = keyof ClientFormInput;

export type ClientValidationMessageKey =
  | "fullNameRequired"
  | "companyRequired"
  | "contactRequired"
  | "emailInvalid"
  | "clientTypeRequired";

export type ClientValidationIssue = {
  field: ClientField;
  messageKey: ClientValidationMessageKey;
};

export type ClientFieldErrors = Partial<Record<ClientField, string>>;

export function isBlankString(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

export function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) return null;
  return trimmed.replace(/[\s\-().]/g, "");
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalString(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function collectClientValidationIssues(input: ClientFormInput): ClientValidationIssue[] {
  const issues: ClientValidationIssue[] = [];
  const clientType = input.client_type ?? DEFAULT_CLIENT_TYPE;

  if (clientType === "individual") {
    if (isBlankString(input.full_name)) {
      issues.push({ field: "full_name", messageKey: "fullNameRequired" });
    }
  } else if (isBlankString(input.company)) {
    issues.push({ field: "company", messageKey: "companyRequired" });
  }

  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  if (!phone && !email) {
    issues.push({ field: "phone", messageKey: "contactRequired" });
    issues.push({ field: "email", messageKey: "contactRequired" });
  }

  if (email && !isValidEmail(email)) {
    issues.push({ field: "email", messageKey: "emailInvalid" });
  }

  return issues;
}

export function normalizeClientPayload(input: ClientFormInput) {
  const clientType = input.client_type ?? DEFAULT_CLIENT_TYPE;

  return {
    client_type: clientType,
    full_name:
      input.full_name.trim() ||
      normalizeOptionalString(input.company) ||
      "",
    company: normalizeOptionalString(input.company),
    phone: normalizePhone(input.phone),
    email: normalizeEmail(input.email),
    address: normalizeOptionalString(input.address),
    city: normalizeOptionalString(input.city),
    postal_code: normalizeOptionalString(input.postal_code),
    country: normalizeOptionalString(input.country),
    preferred_language: input.preferred_language ?? null,
    tax_id: normalizeOptionalString(input.tax_id),
    vat_id: normalizeOptionalString(input.vat_id),
    notes: normalizeOptionalString(input.notes),
    is_active: input.is_active ?? true,
  };
}

export function getClientDisplayName(client: {
  client_type?: string | null;
  full_name: string;
  company?: string | null;
}): string {
  if (client.client_type === "company" && client.company?.trim()) {
    return client.company.trim();
  }
  return client.full_name?.trim() || client.company?.trim() || "";
}
