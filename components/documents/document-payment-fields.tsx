"use client";

import { useTranslations } from "next-intl";
import { PAYMENT_METHOD_VALUES } from "@/lib/constants/documents";
import {
  calculateOutstandingBalance,
  canMarkPaidInFull,
  resolveFormPaidAmount,
} from "@/lib/documents/payment";
import type { DocumentTaskFormInput } from "@/lib/types/documents";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DocumentPaymentFieldsProps = {
  form: DocumentTaskFormInput;
  onChange: <K extends keyof DocumentTaskFormInput>(
    key: K,
    value: DocumentTaskFormInput[K]
  ) => void;
  fieldClass: (field: keyof DocumentTaskFormInput | "paid_in_full") => string;
  fieldErrors: Partial<Record<keyof DocumentTaskFormInput | "paid_in_full", string>>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function DocumentPaymentFields({
  form,
  onChange,
  fieldClass,
  fieldErrors,
}: DocumentPaymentFieldsProps) {
  const t = useTranslations("documents");
  const tFields = useTranslations("fields");
  const tMethods = useTranslations("documents.paymentMethods");
  const tValidation = useTranslations("documents.validation");
  const { formatCurrency } = useFormatters();

  const servicePrice = form.service_price ?? null;
  const paidInFull = Boolean(form.paid_in_full);
  const canPayInFull = canMarkPaidInFull(servicePrice);
  const effectivePaidAmount = resolveFormPaidAmount({
    servicePrice,
    paidAmount: form.paid_amount ?? 0,
    paidInFull,
  });
  const outstanding = calculateOutstandingBalance(servicePrice, effectivePaidAmount);

  function handlePaidInFullChange(checked: boolean) {
    onChange("paid_in_full", checked);
    if (checked && canPayInFull) {
      onChange("paid_amount", Number(servicePrice));
    }
  }

  function handleServicePriceChange(value: number | null) {
    onChange("service_price", value);
    if (paidInFull && canMarkPaidInFull(value)) {
      onChange("paid_amount", Number(value));
    }
  }

  return (
    <div className="space-y-4 md:col-span-2">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="document_service_price">{t("servicePrice")}</Label>
          <Input
            id="document_service_price"
            type="number"
            min="0"
            step="0.01"
            value={form.service_price ?? ""}
            onChange={(event) =>
              handleServicePriceChange(
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            className={fieldClass("service_price")}
          />
          <FieldError message={fieldErrors.service_price} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document_cost_price">{t("costPrice")}</Label>
          <Input
            id="document_cost_price"
            type="number"
            min="0"
            step="0.01"
            value={form.cost_price ?? ""}
            onChange={(event) =>
              onChange(
                "cost_price",
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            className={fieldClass("cost_price")}
          />
          <FieldError message={fieldErrors.cost_price} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input
            id="document_paid_in_full"
            type="checkbox"
            checked={paidInFull}
            disabled={!canPayInFull}
            onChange={(event) => handlePaidInFullChange(event.target.checked)}
            className="accent-red-500"
          />
          {t("paidInFull")}
        </label>
        {!canPayInFull ? (
          <FieldError message={fieldErrors.paid_in_full ?? tValidation("paidInFullRequiresPrice")} />
        ) : (
          <FieldError message={fieldErrors.paid_in_full} />
        )}
      </div>

      {!paidInFull ? (
        <div className="space-y-2">
          <Label htmlFor="document_paid_amount">{t("paidAmount")}</Label>
          <Input
            id="document_paid_amount"
            type="number"
            min="0"
            step="0.01"
            value={form.paid_amount ?? ""}
            onChange={(event) =>
              onChange(
                "paid_amount",
                event.target.value === "" ? 0 : Number(event.target.value)
              )
            }
            className={fieldClass("paid_amount")}
          />
          <FieldError message={fieldErrors.paid_amount} />
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm">
        <span className="text-zinc-500">{t("outstandingBalance")}: </span>
        <span className="font-medium text-zinc-100">{formatCurrency(outstanding)}</span>
      </div>

      {effectivePaidAmount > 0 ? (
        <div className="space-y-2">
          <Label>{t("paymentMethod")}</Label>
          <Select
            value={form.payment_method ?? "none"}
            onValueChange={(value) =>
              onChange("payment_method", value === "none" ? null : value)
            }
          >
            <SelectTrigger id="document_payment_method">
              <SelectValue placeholder={tFields("notSelected")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{tFields("notSelected")}</SelectItem>
              {PAYMENT_METHOD_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {tMethods(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
