"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  resolveCarNextRecommendedAction,
  type CarNextActionContext,
} from "@/lib/cars/next-recommended-action";
import type { Car, CarExpense } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import type {
  DocumentTemplate,
  GeneratedDocument,
} from "@/lib/types/document-templates";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarNextActionPanelProps = {
  car: Car;
  expenses: CarExpense[];
  documentTasks: DocumentTaskWithRelations[];
  detailingOrders: DetailingOrderWithServices[];
  generatedDocuments: GeneratedDocument[];
  documentTemplates: DocumentTemplate[];
  onMarkSold: () => void;
  onScrollToSaleDocuments: () => void;
};

export function CarNextActionPanel({
  car,
  expenses,
  documentTasks,
  detailingOrders,
  generatedDocuments,
  documentTemplates,
  onMarkSold,
  onScrollToSaleDocuments,
}: CarNextActionPanelProps) {
  const t = useTranslations("cars.nextAction");

  const action = useMemo(() => {
    const context: CarNextActionContext = {
      car,
      expenses,
      documentTasks,
      detailingOrders,
      generatedDocuments,
      documentTemplates,
    };
    return resolveCarNextRecommendedAction(context);
  }, [
    car,
    expenses,
    documentTasks,
    detailingOrders,
    generatedDocuments,
    documentTemplates,
  ]);

  if (!action) return null;

  const title = t(`${action.id}.title`);
  const explanation = t(`${action.id}.explanation`);
  const actionLabel = t(`${action.id}.action`);

  function handlePrimaryClick() {
    if (action?.trigger === "mark_sold") {
      onMarkSold();
      return;
    }
    if (action?.trigger === "scroll_sale_documents") {
      onScrollToSaleDocuments();
    }
  }

  const primaryButton = action.href ? (
    <Button asChild className="shrink-0">
      <Link href={action.href}>
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  ) : (
    <Button className="shrink-0" onClick={handlePrimaryClick}>
      {actionLabel}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );

  return (
    <section
      className={cn(
        "rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-950/35 to-zinc-950/80",
        "p-4 shadow-[0_0_24px_-10px_rgba(56,189,248,0.35)] sm:p-5"
      )}
      aria-label={t("sectionLabel")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300/90">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("heading")}
          </p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="max-w-2xl text-sm text-zinc-400">{explanation}</p>
        </div>
        {primaryButton}
      </div>
    </section>
  );
}
