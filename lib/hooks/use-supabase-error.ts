"use client";

import { useTranslations } from "next-intl";

export function useFormatSupabaseError() {
  const t = useTranslations("errors");

  return (error: { message?: string; code?: string }) => {
    console.error("[Supabase]", {
      code: error.code,
      message: error.message,
    });
    return error.message ?? t("generic");
  };
}
