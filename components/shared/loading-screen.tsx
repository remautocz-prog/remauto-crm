"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type LoadingMessageKey = "app" | "dashboard" | "signIn" | "carDetails" | "cars";

type LoadingScreenProps = {
  message?: string;
  messageKey?: LoadingMessageKey;
};

export function LoadingScreen({ message, messageKey = "app" }: LoadingScreenProps) {
  const t = useTranslations("loading");
  const tCars = useTranslations("cars");
  const resolvedMessage =
    message ??
    (messageKey === "cars"
      ? tCars("loading")
      : messageKey === "carDetails"
      ? t("carDetails")
      : messageKey === "dashboard"
        ? t("dashboard")
        : messageKey === "signIn"
          ? t("signIn")
          : messageKey === "app"
            ? t("app")
            : tCars("loading"));

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      <p className="text-sm text-zinc-400">{resolvedMessage}</p>
    </div>
  );
}
