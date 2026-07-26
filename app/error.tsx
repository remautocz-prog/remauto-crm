"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/shared/error-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <ErrorScreen
      title={t("app")}
      message={error.message || t("loadApp")}
      reset={reset}
    />
  );
}
