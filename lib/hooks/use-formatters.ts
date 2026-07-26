"use client";

import { useLocale } from "next-intl";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMileage,
  formatNumber,
} from "@/lib/format";
import { isValidLocale, type AppLocale } from "@/i18n/config";

export function useFormatters() {
  const rawLocale = useLocale();
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";

  return {
    locale,
    formatCurrency: (amount: number) => formatCurrency(amount, locale),
    formatNumber: (value: number) => formatNumber(value, locale),
    formatMileage: (value: number) => formatMileage(value, locale),
    formatDate: (value: string | null | undefined, empty?: string) =>
      formatDate(value, locale, empty),
    formatDateTime: (value: string | null | undefined, empty?: string) =>
      formatDateTime(value, locale, empty),
  };
}
