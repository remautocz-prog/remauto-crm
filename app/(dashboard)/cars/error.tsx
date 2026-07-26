"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/shared/error-screen";

export default function CarsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <ErrorScreen
      title={t("cars")}
      message={error.message || t("loadCars")}
      reset={reset}
    />
  );
}
