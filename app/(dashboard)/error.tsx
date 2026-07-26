"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/shared/error-screen";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <ErrorScreen
      title={t("dashboard")}
      message={error.message || t("loadDashboard")}
      reset={reset}
    />
  );
}
