import { toCardinal as toCardinalCs } from "n2words/cs-CZ";
import { toCardinal as toCardinalEn } from "n2words/en-US";
import { toCardinal as toCardinalRu } from "n2words/ru-RU";
import type { DealCurrency } from "@/lib/constants/deals";
import type { AppLocale } from "@/i18n/config";
import { roundMoney } from "@/lib/deals/finance";

const CARDINAL_BY_LOCALE: Record<AppLocale, (value: number) => string> = {
  cs: (value) => toCardinalCs(value),
  en: (value) => toCardinalEn(value),
  ru: (value) => toCardinalRu(value),
};

const CURRENCY_LABELS: Record<
  DealCurrency,
  Record<AppLocale, { major: string; minor: string }>
> = {
  CZK: {
    cs: { major: "korun", minor: "haléřů" },
    en: { major: "Czech koruna", minor: "haléř" },
    ru: { major: "чешских крон", minor: "галéř" },
  },
  EUR: {
    cs: { major: "eur", minor: "centů" },
    en: { major: "euros", minor: "cents" },
    ru: { major: "евро", minor: "центов" },
  },
};

export function formatAmountInWords(
  amount: number | null | undefined,
  currency: DealCurrency,
  locale: AppLocale
): string {
  if (amount == null || Number.isNaN(amount)) return "";

  const normalized = roundMoney(Math.abs(amount));
  const major = Math.floor(normalized);
  const minor = Math.round((normalized - major) * 100);
  const labels = CURRENCY_LABELS[currency][locale];
  const toWords = CARDINAL_BY_LOCALE[locale];

  const majorWords = toWords(major);
  const parts = [`${majorWords} ${labels.major}`];

  if (minor > 0) {
    parts.push(`${toWords(minor)} ${labels.minor}`);
  }

  return parts.join(locale === "en" ? " and " : " ");
}

export function getAmountInWordsLimitation(locale: AppLocale) {
  const messages: Record<AppLocale, string> = {
    cs: "Částka slovy je generována pomocí knihovny n2words. Vždy zkontrolujte správnost před podpisem.",
    en: "Amount in words is generated via n2words. Always verify before signing.",
    ru: "Сумма прописью генерируется через n2words. Всегда проверяйте перед подписанием.",
  };
  return messages[locale];
}
