import { HANDOVER_DOCUMENT_VALUES, type HandoverDocumentValue } from "@/lib/constants/handover";
import type { DealCurrency, DealPaymentMethod, DealPaymentPayer } from "@/lib/constants/deals";
import { formatAmountInWords } from "@/lib/deals/amount-in-words";
import { getIntlLocale, type AppLocale } from "@/i18n/config";

export const CHECKBOX_CHECKED = "☑";
export const CHECKBOX_UNCHECKED = "☐";

const KNOWN_HANDOVER_DOCUMENTS = new Set<string>(HANDOVER_DOCUMENT_VALUES);

export function formatCheckbox(selected: boolean): string {
  return selected ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
}

export function emptyText(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).trim();
}

export function combineMakeModel(make: string, model: string): string {
  return [make, model].map((part) => part.trim()).filter(Boolean).join(" ");
}

export function formatCzechDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatCzechDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatMileageNumber(
  value: string | number | null | undefined,
  locale: AppLocale
): string {
  if (value == null || value === "") return "";
  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(numeric)) return emptyText(value);
  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(numeric);
}

const FUEL_LABELS: Record<string, Record<AppLocale, string>> = {
  petrol: { cs: "Benzín", en: "Petrol", ru: "Бензин" },
  diesel: { cs: "Diesel", en: "Diesel", ru: "Дизель" },
  electric: { cs: "Elektro", en: "Electric", ru: "Электро" },
  hybrid: { cs: "Hybrid", en: "Hybrid", ru: "Гибрид" },
  plug_in_hybrid: { cs: "Plug-in hybrid", en: "Plug-in hybrid", ru: "Plug-in hybrid" },
  lpg: { cs: "LPG", en: "LPG", ru: "LPG" },
  cng: { cs: "CNG", en: "CNG", ru: "CNG" },
  other: { cs: "Jiné", en: "Other", ru: "Другое" },
};

export function formatEnginePower(value: string | number | null | undefined): string {
  const raw = emptyText(value);
  if (!raw) return "";
  return raw.replace(/\s*kW\s*$/i, "").trim();
}

export function formatFuelLabel(
  value: string | null | undefined,
  locale: AppLocale
): string {
  const raw = emptyText(value);
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const preset = FUEL_LABELS[normalized];
  if (preset) return preset[locale];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatEngineVolume(
  value: string | number | null | undefined,
  locale: AppLocale
): string {
  const raw = emptyText(value);
  if (!raw) return "";
  const numeric = Number(String(raw).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(numeric)) return "";
  const formatted = new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(numeric);
  return `${formatted} cm³`;
}

export function formatEnginePowerWithUnit(
  value: string | number | null | undefined
): string {
  const power = formatEnginePower(value);
  if (!power) return "";
  return `${power} kW`;
}

export function formatFuelEnginePower(input: {
  fuel: string;
  engineVolume: string;
  enginePower: string;
  locale: AppLocale;
}): string {
  const parts = [
    formatFuelLabel(input.fuel, input.locale),
    formatEngineVolume(input.engineVolume, input.locale),
    formatEnginePowerWithUnit(input.enginePower),
  ].filter(Boolean);
  return parts.join(" / ");
}

export function resolveHandoverDate(input: {
  handoverDate: string | null | undefined;
  vehicleADatetime: string | null | undefined;
  vehicleBDatetime: string | null | undefined;
}): string {
  const general = formatCzechDate(input.handoverDate);
  if (general) return general;
  const fromA = formatCzechDate(input.vehicleADatetime);
  if (fromA) return fromA;
  return formatCzechDate(input.vehicleBDatetime);
}


export function formatDealCurrencyAmount(
  amount: number | null | undefined,
  currency: DealCurrency | string,
  locale: AppLocale
): string {
  if (amount == null || Number.isNaN(amount)) return "";
  const formatted = new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
  if (currency === "EUR") return `${formatted} EUR`;
  return `${formatted} Kč`;
}

export function formatBirthDateOrIco(input: {
  clientType: string;
  birthDate: string;
  taxId: string;
}): string {
  if (input.clientType === "company") return emptyText(input.taxId);
  return formatCzechDate(input.birthDate);
}

export function formatPaymentPayerCheckboxes(payer: DealPaymentPayer | null | undefined) {
  const normalized = payer ?? "none";
  return {
    payer_customer_checkbox: formatCheckbox(normalized === "customer"),
    payer_remauto_checkbox: formatCheckbox(normalized === "remauto"),
  };
}

export function formatPaymentMethodCheckboxes(
  method: DealPaymentMethod | null | undefined
) {
  const normalized = method ?? "";
  return {
    cash_checkbox: formatCheckbox(normalized === "cash"),
    bank_transfer_checkbox: formatCheckbox(normalized === "bank_transfer"),
    other_checkbox: formatCheckbox(normalized === "other"),
  };
}

export type RegistrationPayer = "each_party" | "remauto" | "customer" | "other" | "";

export function formatRegistrationPayerCheckboxes(payer: RegistrationPayer) {
  return {
    each_party_checkbox: formatCheckbox(payer === "each_party"),
    remauto_checkbox: formatCheckbox(payer === "remauto"),
    customer_checkbox: formatCheckbox(payer === "customer"),
    other_checkbox: formatCheckbox(payer === "other"),
  };
}

function getOtherDocumentText(documents: string[], notes?: string | null): string {
  const customEntries = documents
    .filter((entry) => entry.startsWith("other:"))
    .map((entry) => entry.slice("other:".length).trim())
    .filter(Boolean);
  if (customEntries.length) return customEntries.join(", ");

  const unknownEntries = documents
    .filter((entry) => !KNOWN_HANDOVER_DOCUMENTS.has(entry))
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (unknownEntries.length) return unknownEntries.join(", ");

  if (documents.includes("other") && notes?.trim()) return notes.trim();
  return "";
}

export function formatHandoverDocumentsCheckboxes(
  documents: string[] | undefined,
  notes?: string | null
): string {
  const selected = new Set(documents ?? []);
  const otherText = getOtherDocumentText(documents ?? [], notes);

  const groups = [
    {
      label: "ORV",
      selected: selected.has("orv"),
    },
    {
      label: "TP / COC",
      selected: selected.has("tp") || selected.has("coc"),
    },
    {
      label: "Servisní kniha",
      selected: selected.has("service_book"),
    },
    {
      label: otherText ? `Jiné ${otherText}` : "Jiné",
      selected: selected.has("other") || Boolean(otherText),
    },
  ];

  return groups
    .map(({ label, selected: isSelected }) => `${formatCheckbox(isSelected)} ${label}`)
    .join("   ");
}

export function buildPaymentAmountInWords(
  amount: number | null | undefined,
  currency: DealCurrency,
  locale: AppLocale,
  storedWords?: string | null
): string {
  if (storedWords?.trim()) return storedWords.trim();
  return formatAmountInWords(amount, currency, locale);
}

export function isHandoverDocumentValue(value: string): value is HandoverDocumentValue {
  return KNOWN_HANDOVER_DOCUMENTS.has(value);
}
