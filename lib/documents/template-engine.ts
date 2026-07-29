import Docxtemplater from "docxtemplater";
import { applyLegacyPlaceholderAliases } from "@/lib/documents/placeholder-aliases";
import PizZip from "pizzip";
import { formatCurrency, formatDate } from "@/lib/format";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import type { AppLocale } from "@/i18n/config";
import type { Car } from "@/lib/types/cars";
import type { Client } from "@/lib/types/clients";
import type {
  CompanySettings,
  DocumentTemplateData,
  DocumentTemplateOverrides,
} from "@/lib/types/document-templates";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type { Profile } from "@/lib/types/cars";

function empty(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function formatMoney(value: number | null | undefined, locale: AppLocale) {
  if (value == null || Number.isNaN(value)) return "";
  return formatCurrency(value, locale);
}

function mergeSection(
  base: Record<string, string>,
  overrides?: Partial<Record<string, string>>
): Record<string, string> {
  const merged = { ...base, ...(overrides ?? {}) };
  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, value ?? ""])
  );
}

export function buildDocumentTemplateData(input: {
  locale: AppLocale;
  company?: CompanySettings | null;
  client?: Client | null;
  vehicle?: Car | null;
  order?: DocumentTaskWithRelations | null;
  employee?: Profile | null;
  overrides?: DocumentTemplateOverrides;
  signingDate?: string | null;
  generatedCity?: string | null;
  additionalNotes?: string | null;
}): DocumentTemplateData {
  const today = formatDate(new Date().toISOString(), input.locale, "");
  const company = input.company;

  const clientAddress = [
    input.client?.address,
    input.client?.postal_code,
    input.client?.city,
    input.client?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const finance = input.order ? getDocumentFinanceSummary(input.order) : null;
  const salePrice =
    input.vehicle?.actual_sale_price ??
    input.vehicle?.sale_price ??
    null;

  const base: DocumentTemplateData = {
    company: {
      name: empty(company?.name),
      ico: empty(company?.ico),
      dic: empty(company?.dic),
      address: empty(company?.address),
      city: empty(company?.city),
      phone: empty(company?.phone),
      email: empty(company?.email),
    },
    client: {
      full_name: input.client
        ? getClientDisplayName(input.client)
        : "",
      company_name: empty(input.client?.company),
      birth_date: empty(input.client?.birth_date),
      id_number: empty(input.client?.personal_id_number) || empty(input.client?.tax_id),
      address: empty(clientAddress),
      phone: empty(input.client?.phone),
      email: empty(input.client?.email),
    },
    vehicle: {
      make: empty(input.vehicle?.brand),
      model: empty(input.vehicle?.model),
      year: input.vehicle?.year ? String(input.vehicle.year) : "",
      vin: empty(input.vehicle?.vin),
      plate: empty(input.vehicle?.registration_number),
      mileage: "",
      purchase_price: formatMoney(input.vehicle?.purchase_price ?? null, input.locale),
      sale_price: formatMoney(salePrice, input.locale),
    },
    order: {
      number: input.order ? String(input.order.id) : "",
      total_price: finance ? formatMoney(finance.servicePrice, input.locale) : "",
      paid_amount: finance ? formatMoney(finance.paidAmount, input.locale) : "",
      outstanding_balance: finance
        ? formatMoney(finance.outstandingBalance, input.locale)
        : "",
    },
    document: {
      generated_date: today,
      generated_city: empty(input.generatedCity ?? company?.city),
      signing_date: formatDate(input.signingDate ?? today, input.locale, today),
      additional_notes: empty(input.additionalNotes),
    },
    employee: {
      full_name: empty(input.employee?.full_name),
    },
  };

  return {
    company: mergeSection(base.company, input.overrides?.company),
    client: mergeSection(base.client, input.overrides?.client),
    vehicle: mergeSection(base.vehicle, input.overrides?.vehicle),
    order: mergeSection(base.order, input.overrides?.order),
    document: mergeSection(base.document, input.overrides?.document),
    employee: mergeSection(base.employee, input.overrides?.employee),
  };
}

export function flattenTemplateData(data: DocumentTemplateData) {
  return data;
}

export function renderDocxTemplate(
  templateBuffer: Buffer | ArrayBuffer,
  data: DocumentTemplateData
): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: false,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "",
  });

  doc.render(applyLegacyPlaceholderAliases(data));
  return Buffer.from(doc.getZip().generate({ type: "nodebuffer" }));
}

export function extractPlaceholdersFromDocx(buffer: Buffer | ArrayBuffer): string[] {
  const zip = new PizZip(buffer);
  const xmlParts = Object.keys(zip.files).filter(
    (path) => path.startsWith("word/") && path.endsWith(".xml")
  );

  const found = new Set<string>();
  const pattern = /\{\{([^{}]+)\}\}/g;

  for (const path of xmlParts) {
    const content = zip.files[path]?.asText();
    if (!content) continue;
    const normalized = content.replace(/<[^>]+>/g, "");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalized)) !== null) {
      const raw = match[1]?.trim();
      if (!raw) continue;
      found.add(`{{${raw}}}`);
    }
  }

  return Array.from(found).sort();
}

export function sanitizeDocumentFilename(name: string) {
  const trimmed = name.trim().replace(/[^\w\s.-]/gi, "").replace(/\s+/g, "_");
  return trimmed.slice(0, 120) || "document";
}
