"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { DocumentTaskServiceFormInput } from "@/lib/types/documents";
import {
  calculateServiceTotals,
  createEmptyServiceRow,
} from "@/lib/documents/task-services";
import { DocumentServiceSelect } from "@/components/documents/document-service-select";
import { bindDocumentServiceTranslator, translateDocumentService } from "@/lib/i18n/documents";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DocumentTaskServicesFieldsProps = {
  services: DocumentTaskServiceFormInput[];
  onChange: (services: DocumentTaskServiceFormInput[]) => void;
  fieldErrors: Partial<Record<string, string>>;
  onTotalsChange?: (totals: { totalServicePrice: number; totalCostPrice: number }) => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function DocumentTaskServicesFields({
  services,
  onChange,
  fieldErrors,
  onTotalsChange,
}: DocumentTaskServicesFieldsProps) {
  const t = useTranslations("documents");
  const tServices = useTranslations("documents.services");
  const { formatCurrency } = useFormatters();

  const rows = services.length ? services : [createEmptyServiceRow()];
  const totals = calculateServiceTotals(
    rows.filter((row) => row.service_name.trim())
  );

  useEffect(() => {
    onTotalsChange?.({
      totalServicePrice: totals.totalServicePrice,
      totalCostPrice: totals.totalCostPrice,
    });
  }, [onTotalsChange, totals.totalCostPrice, totals.totalServicePrice]);

  function updateRow(index: number, patch: Partial<DocumentTaskServiceFormInput>) {
    const next = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row
    );
    onChange(next);
  }

  function addRow() {
    onChange([...rows, createEmptyServiceRow(rows.length)]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next.map((row, rowIndex) => ({ ...row, sort_order: rowIndex })));
  }

  function handleCatalogSelect(index: number, code: string | null) {
    if (!code) return;
    const serviceT = bindDocumentServiceTranslator(tServices as (key: never) => string);
    const label = translateDocumentService(serviceT, code);
    // Prices are entered manually because RemAuto uses individual pricing for each client.
    updateRow(index, {
      service_code: code,
      service_name: code === "custom" ? rows[index]?.service_name ?? "" : label,
    });
  }

  return (
    <div className="space-y-4 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-base text-white">{t("servicesTitle")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          {t("addService")}
        </Button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id ?? `new-${index}`}
            data-field={`services.${index}.service_name`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-zinc-300">
                {t("service")} {index + 1}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                  aria-label={t("moveServiceUp")}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === rows.length - 1}
                  onClick={() => moveRow(index, 1)}
                  aria-label={t("moveServiceDown")}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(index)}
                  aria-label={t("removeService")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`document_service_name_${index}`}>{t("serviceName")} *</Label>
                <Input
                  id={`document_service_name_${index}`}
                  value={row.service_name}
                  onChange={(event) =>
                    updateRow(index, { service_name: event.target.value, service_code: null })
                  }
                />
                <FieldError message={fieldErrors[`services.${index}.service_name`]} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{t("pickServiceFromCatalog")}</Label>
                <DocumentServiceSelect
                  id={`document_service_catalog_${index}`}
                  value={row.service_code ?? null}
                  onChange={(code) => handleCatalogSelect(index, code)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`document_service_price_${index}`}>{t("servicePrice")}</Label>
                <Input
                  id={`document_service_price_${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.service_price === 0 ? "" : row.service_price}
                  onChange={(event) =>
                    updateRow(index, {
                      service_price:
                        event.target.value === "" ? 0 : Number(event.target.value),
                    })
                  }
                />
                <FieldError message={fieldErrors[`services.${index}.service_price`]} />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`document_service_cost_${index}`}>{t("costPrice")}</Label>
                <Input
                  id={`document_service_cost_${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.cost_price === 0 ? "" : row.cost_price}
                  onChange={(event) =>
                    updateRow(index, {
                      cost_price:
                        event.target.value === "" ? 0 : Number(event.target.value),
                    })
                  }
                />
                <FieldError message={fieldErrors[`services.${index}.cost_price`]} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`document_service_notes_${index}`}>{t("serviceNotes")}</Label>
                <Textarea
                  id={`document_service_notes_${index}`}
                  rows={2}
                  value={row.notes ?? ""}
                  onChange={(event) =>
                    updateRow(index, { notes: event.target.value || null })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">{t("totalPrice")}</span>
          <span className="font-medium text-zinc-100">{formatCurrency(totals.totalServicePrice)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-zinc-500">{t("totalCost")}</span>
          <span className="text-zinc-300">{formatCurrency(totals.totalCostPrice)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-zinc-500">{t("totalProfit")}</span>
          <span className="text-zinc-300">{formatCurrency(totals.profit)}</span>
        </div>
      </div>
    </div>
  );
}
