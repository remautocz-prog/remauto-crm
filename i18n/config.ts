export const locales = ["ru", "cs", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ru";

export const LOCALE_COOKIE = "locale";

export const localeLabels: Record<
  AppLocale,
  { short: string; name: string }
> = {
  ru: { short: "RU", name: "Русский" },
  cs: { short: "CZ", name: "Čeština" },
  en: { short: "EN", name: "English" },
};

export function isValidLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function getIntlLocale(locale: AppLocale): string {
  switch (locale) {
    case "ru":
      return "ru-CZ";
    case "cs":
      return "cs-CZ";
    case "en":
      return "en-CZ";
  }
}
