"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ErrorScreenProps = {
  title?: string;
  message?: string;
  reset?: () => void;
};

export function ErrorScreen({ title, message, reset }: ErrorScreenProps) {
  const tErrors = useTranslations("errors");
  const tActions = useTranslations("actions");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/15 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          {title ?? tErrors("generic")}
        </h2>
        <p className="max-w-md text-sm text-zinc-400">
          {message ?? tErrors("loadApp")}
        </p>
      </div>
      {reset ? (
        <Button onClick={reset} variant="outline">
          <RefreshCw className="h-4 w-4" />
          {tActions("tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
