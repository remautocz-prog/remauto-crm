import type { ClientPreferredLanguage } from "@/lib/constants/clients";

type PreferredLanguageTranslator = (
  key: ClientPreferredLanguage
) => string;

export function translatePreferredLanguage(
  t: PreferredLanguageTranslator,
  value: ClientPreferredLanguage | string | null | undefined
) {
  if (value === "ru" || value === "cs" || value === "en") {
    return t(value);
  }
  return value ?? "";
}

export function translateClientType(
  t: (key: "individual" | "company") => string,
  value: string | null | undefined
) {
  if (value === "individual" || value === "company") {
    return t(value);
  }
  return value ?? "";
}
