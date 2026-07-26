"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      title="Dashboard error"
      message={error.message || "Failed to load dashboard data."}
      reset={reset}
    />
  );
}
