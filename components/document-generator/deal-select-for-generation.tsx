"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { listDealsForDocumentGenerationAction } from "@/lib/actions/document-generation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DealOption = {
  id: string;
  deal_number: string;
  label: string;
};

type DealSelectForGenerationProps = {
  value: string;
  onChange: (dealId: string) => void;
  disabled?: boolean;
};

export function DealSelectForGeneration({
  value,
  onChange,
  disabled,
}: DealSelectForGenerationProps) {
  const t = useTranslations("documentGenerator");
  const [options, setOptions] = useState<DealOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listDealsForDocumentGenerationAction();
      if (!result.success) {
        setError(result.error ?? t("dealListLoadFailed"));
        return;
      }
      if (!result.data) {
        setError(t("dealListLoadFailed"));
        return;
      }
      setOptions(result.data.deals);
      setError(null);
    });
  }, [t]);

  return (
    <div className="space-y-2">
      <Label>{t("selectDeal")}</Label>
      <Select
        value={value || "none"}
        onValueChange={(next) => onChange(next === "none" ? "" : next)}
        disabled={disabled || isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectDealPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t("selectDealPlaceholder")}</SelectItem>
          {options.map((deal) => (
            <SelectItem key={deal.id} value={deal.id}>
              {deal.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("loadingDeals")}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
