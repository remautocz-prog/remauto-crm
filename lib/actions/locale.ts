"use server";

import { cookies } from "next/headers";
import {
  defaultLocale,
  isValidLocale,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/i18n/config";

export async function setLocale(locale: string): Promise<AppLocale> {
  const nextLocale = isValidLocale(locale) ? locale : defaultLocale;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, nextLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return nextLocale;
}
