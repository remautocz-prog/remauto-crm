import {
  defaultLocale,
  getIntlLocale,
  type AppLocale,
} from "@/i18n/config";

const CURRENCY = "CZK";

type FormatterCache = {
  currency: Map<string, Intl.NumberFormat>;
  number: Map<string, Intl.NumberFormat>;
  date: Map<string, Intl.DateTimeFormat>;
  dateTime: Map<string, Intl.DateTimeFormat>;
};

const cache: FormatterCache = {
  currency: new Map(),
  number: new Map(),
  date: new Map(),
  dateTime: new Map(),
};

function getCurrencyFormatter(locale: AppLocale) {
  const intlLocale = getIntlLocale(locale);
  if (!cache.currency.has(intlLocale)) {
    cache.currency.set(
      intlLocale,
      new Intl.NumberFormat(intlLocale, {
        style: "currency",
        currency: CURRENCY,
        maximumFractionDigits: 0,
      })
    );
  }
  return cache.currency.get(intlLocale)!;
}

function getNumberFormatter(locale: AppLocale) {
  const intlLocale = getIntlLocale(locale);
  if (!cache.number.has(intlLocale)) {
    cache.number.set(
      intlLocale,
      new Intl.NumberFormat(intlLocale, {
        maximumFractionDigits: 0,
      })
    );
  }
  return cache.number.get(intlLocale)!;
}

function getDateFormatter(locale: AppLocale) {
  const intlLocale = getIntlLocale(locale);
  if (!cache.date.has(intlLocale)) {
    cache.date.set(intlLocale, new Intl.DateTimeFormat(intlLocale));
  }
  return cache.date.get(intlLocale)!;
}

function getDateTimeFormatter(locale: AppLocale) {
  const intlLocale = getIntlLocale(locale);
  if (!cache.dateTime.has(intlLocale)) {
    cache.dateTime.set(
      intlLocale,
      new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
  return cache.dateTime.get(intlLocale)!;
}

export function formatCurrency(amount: number, locale: AppLocale = defaultLocale) {
  return getCurrencyFormatter(locale).format(amount);
}

export function formatNumber(value: number, locale: AppLocale = defaultLocale) {
  return getNumberFormatter(locale).format(value);
}

export function formatMileage(value: number, locale: AppLocale = defaultLocale) {
  return `${formatNumber(value, locale)} km`;
}

export function formatDate(
  value: string | null | undefined,
  locale: AppLocale = defaultLocale,
  empty = "—"
) {
  if (!value) return empty;
  return getDateFormatter(locale).format(new Date(value));
}

export function formatDateTime(
  value: string | null | undefined,
  locale: AppLocale = defaultLocale,
  empty = "—"
) {
  if (!value) return empty;
  return getDateTimeFormatter(locale).format(new Date(value));
}
