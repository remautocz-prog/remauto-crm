"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/shared/error-screen";

export default function CarDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <ErrorScreen
      title={t("carDetails")}
      message={error.message || t("loadCarDetails")}
      reset={reset}
    />
  );
}
