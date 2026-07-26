"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { Car, ClientOption } from "@/lib/types/cars";
import {
  collectMarkSoldValidationIssues,
  resolveSaleBasePrice,
  type CarFieldErrors,
  type CarValidationMessageKey,
} from "@/lib/cars/business-rules";
import { DEFAULT_BUSINESS_MODEL } from "@/lib/constants/business-model";
import { markCarSoldAction } from "@/lib/actions/cars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MarkSoldDialogProps = {
  car: Car;
  clients: ClientOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function focusFirstFieldError(fieldErrors: CarFieldErrors) {
  const firstField = Object.keys(fieldErrors)[0];
  if (!firstField) return;

  const element =
    document.getElementById(`mark_sold_${firstField}`) ??
    document.querySelector<HTMLElement>(`[data-field="${firstField}"]`);

  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (element instanceof HTMLElement && "focus" in element) {
    element.focus({ preventScroll: true });
  }
}

export function MarkSoldDialog({
  car,
  clients,
  open,
  onOpenChange,
}: MarkSoldDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CarFieldErrors>({});

  const saleBase = resolveSaleBasePrice(car);
  const defaultSalePrice =
    car.actual_sale_price && Number(car.actual_sale_price) > 0
      ? String(car.actual_sale_price)
      : saleBase.price > 0
        ? String(saleBase.price)
        : "";

  const [actualSalePrice, setActualSalePrice] = useState(defaultSalePrice);
  const [saleDate, setSaleDate] = useState(
    car.sale_date ?? new Date().toISOString().slice(0, 10)
  );
  const [clientId, setClientId] = useState(
    car.client_id ? String(car.client_id) : "none"
  );

  const model = car.business_model ?? DEFAULT_BUSINESS_MODEL;

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tValidation = useTranslations("validation");

  const descriptionKey =
    model === "commission"
      ? "markSoldDescriptionCommission"
      : model === "client_order"
        ? "markSoldDescriptionClientOrder"
        : "markSoldDescription";

  function validateForm(): CarFieldErrors | null {
    const issues = collectMarkSoldValidationIssues(car, {
      actual_sale_price: actualSalePrice.trim() === "" ? null : Number(actualSalePrice),
      sale_date: saleDate,
      client_id: clientId === "none" ? null : Number(clientId),
    });

    if (issues.length === 0) return null;

    const next: CarFieldErrors = {};
    for (const issue of issues) {
      next[issue.field] = tValidation(issue.messageKey as CarValidationMessageKey);
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const clientFieldErrors = validateForm();
    if (clientFieldErrors) {
      setFieldErrors(clientFieldErrors);
      setError(Object.values(clientFieldErrors)[0] ?? null);
      focusFirstFieldError(clientFieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await markCarSoldAction(car.id, {
        actual_sale_price: Number(actualSalePrice),
        sale_date: saleDate,
        client_id: clientId === "none" ? null : Number(clientId),
      });

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          focusFirstFieldError(result.fieldErrors);
        }
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  const fieldClass = (field: keyof CarFieldErrors) =>
    cn(fieldErrors[field] && "border-red-500 focus-visible:ring-red-500/40");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("markSoldTitle")}</DialogTitle>
          <DialogDescription>{t(descriptionKey)}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="mark_sold_actual_sale_price">{tFields("actualSalePrice")} *</Label>
            <Input
              id="mark_sold_actual_sale_price"
              data-field="actual_sale_price"
              type="number"
              min="0"
              step="0.01"
              value={actualSalePrice}
              onChange={(e) => {
                setActualSalePrice(e.target.value);
                setFieldErrors((prev) => {
                  if (!prev.actual_sale_price) return prev;
                  const next = { ...prev };
                  delete next.actual_sale_price;
                  return next;
                });
              }}
              className={fieldClass("actual_sale_price")}
              aria-invalid={Boolean(fieldErrors.actual_sale_price)}
            />
            {fieldErrors.actual_sale_price ? (
              <p className="text-sm text-red-400">{fieldErrors.actual_sale_price}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mark_sold_sale_date">{tFields("saleDate")} *</Label>
            <Input
              id="mark_sold_sale_date"
              data-field="sale_date"
              type="date"
              value={saleDate}
              onChange={(e) => {
                setSaleDate(e.target.value);
                setFieldErrors((prev) => {
                  if (!prev.sale_date) return prev;
                  const next = { ...prev };
                  delete next.sale_date;
                  return next;
                });
              }}
              className={fieldClass("sale_date")}
              aria-invalid={Boolean(fieldErrors.sale_date)}
            />
            {fieldErrors.sale_date ? (
              <p className="text-sm text-red-400">{fieldErrors.sale_date}</p>
            ) : null}
          </div>
          {model !== "commission" ? (
            <div className="space-y-2">
              <Label>{tFields("client")}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="mark_sold_client_id" data-field="client_id">
                  <SelectValue placeholder={tFields("notSelected")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tFields("notSelected")}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {fieldErrors.purchase_price ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {fieldErrors.purchase_price}
            </p>
          ) : null}
          {fieldErrors.commission_type || fieldErrors.commission_value ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {fieldErrors.commission_type ?? fieldErrors.commission_value}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tActions("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("confirmSale")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
