"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardSectionStateProps = {
  title: string;
  error?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
};

export function DashboardSectionState({
  title,
  error,
  isEmpty,
  emptyMessage,
  children,
}: DashboardSectionStateProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");

  if (error) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-red-200">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.refresh()}
              >
                {t("retry")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-sm text-zinc-400">
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}
