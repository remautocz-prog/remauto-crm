import type { AppLocale } from "@/i18n/config";
import type { HandoverDocumentValue } from "@/lib/constants/handover";

const DOCUMENT_LABELS: Record<HandoverDocumentValue, Record<AppLocale, string>> = {
  orv: { cs: "ORV", en: "ORV", ru: "ORV" },
  tp: { cs: "TP", en: "Registration certificate", ru: "СТС" },
  coc: { cs: "COC", en: "COC", ru: "COC" },
  service_book: { cs: "Servisní kniha", en: "Service book", ru: "Сервисная книжка" },
  user_manuals: { cs: "Návody k obsluze", en: "User manuals", ru: "Руководства" },
  insurance_document: {
    cs: "Doklad o pojištění",
    en: "Insurance document",
    ru: "Страховой документ",
  },
  other: { cs: "Jiné", en: "Other", ru: "Другое" },
};

export function formatHandoverDocumentsForTemplate(
  documents: string[] | undefined,
  locale: AppLocale
) {
  if (!documents?.length) return "";
  return documents
    .map((code) => {
      const labels = DOCUMENT_LABELS[code as HandoverDocumentValue];
      return labels ? labels[locale] : code;
    })
    .join(", ");
}

export function formatHandoverFuelLevelForTemplate(value: string | null | undefined, locale: AppLocale) {
  if (!value?.trim()) return "";
  const map: Record<string, Record<AppLocale, string>> = {
    empty: { cs: "Prázdná", en: "Empty", ru: "Пустой" },
    reserve: { cs: "Rezerva", en: "Reserve", ru: "Резерв" },
    quarter: { cs: "1/4", en: "1/4", ru: "1/4" },
    half: { cs: "1/2", en: "1/2", ru: "1/2" },
    three_quarters: { cs: "3/4", en: "3/4", ru: "3/4" },
    full: { cs: "Plná", en: "Full", ru: "Полный" },
  };
  const preset = map[value];
  if (preset) return preset[locale];
  return value;
}
