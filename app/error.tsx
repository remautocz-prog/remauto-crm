"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      title="Application error"
      message={error.message || "Failed to load the application."}
      reset={reset}
    />
  );
}
