"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorScreenProps = {
  title?: string;
  message?: string;
  reset?: () => void;
};

export function ErrorScreen({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  reset,
}: ErrorScreenProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/15 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="max-w-md text-sm text-zinc-400">{message}</p>
      </div>
      {reset ? (
        <Button onClick={reset} variant="outline">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
