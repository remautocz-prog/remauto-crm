"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { Car, CarFormInput, ClientOption, Profile } from "@/lib/types/cars";
import { CAR_STATUS_VALUES } from "@/lib/constants/cars";
import {
  BUSINESS_MODEL_VALUES,
  COMMISSION_TYPE_VALUES,
  DEFAULT_BUSINESS_MODEL,
  type BusinessModel,
} from "@/lib/constants/business-model";
import { clearFieldsForBusinessModel } from "@/lib/cars/business-rules";
import {
  collectCarValidationIssues,
  stripHiddenFieldErrors,
  type CarFieldErrors,
  type CarValidationMessageKey,
} from "@/lib/cars/business-rules";
import { createCarAction, updateCarAction } from "@/lib/actions/cars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translateStatus } from "@/lib/i18n/status";
import {
  translateBusinessModel,
  translateCommissionType,
} from "@/lib/i18n/business-model";
import { cn } from "@/lib/utils";

type CarFormProps = {
  car?: Car;
  clients: ClientOption[];
  profiles: Profile[];
  mode: "create" | "edit";
};

function toFormState(car?: Car): CarFormInput {
  return {
    stock_number: car?.stock_number ?? "",
    vin: car?.vin ?? "",
    brand: car?.brand ?? "",
    model: car?.model ?? "",
    year: car?.year ?? new Date().getFullYear(),
    registration_number: car?.registration_number ?? "",
    color: car?.color ?? "",
    status: car?.status ?? "in_stock",
    business_model: car?.business_model ?? DEFAULT_BUSINESS_MODEL,
    commission_type: car?.commission_type ?? null,
    commission_value: car?.commission_value ?? null,
    owner_net_amount: car?.owner_net_amount ?? null,
    owner_client_id: car?.owner_client_id ?? null,
    contract_end_date: car?.contract_end_date ?? null,
    contract_document_url: car?.contract_document_url ?? "",
    purchase_price: car?.purchase_price ?? null,
    sale_price: car?.sale_price ?? null,
    actual_sale_price: car?.actual_sale_price ?? null,
    purchase_date: car?.purchase_date ?? null,
    sale_date: car?.sale_date ?? null,
    client_id: car?.client_id ?? null,
    manager_id: car?.manager_id ?? null,
    notes: car?.notes ?? "",
  };
}

function toNumberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function focusFirstFieldError(fieldErrors: CarFieldErrors) {
  const firstField = Object.keys(fieldErrors)[0];
  if (!firstField) return;

  const element =
    document.getElementById(firstField) ??
    document.querySelector<HTMLElement>(`[data-field="${firstField}"]`);

  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (element instanceof HTMLElement && "focus" in element) {
    element.focus({ preventScroll: true });
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function CarForm({ car, clients, profiles, mode }: CarFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CarFieldErrors>({});
  const [form, setForm] = useState<CarFormInput>(toFormState(car));

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tStatus = useTranslations("status");
  const tBusinessModel = useTranslations("businessModel");
  const tCommissionType = useTranslations("commissionType");
  const tValidation = useTranslations("validation");

  const businessModel = form.business_model ?? DEFAULT_BUSINESS_MODEL;

  function mapIssuesToFieldErrors(
    issues: ReturnType<typeof collectCarValidationIssues>
  ): CarFieldErrors {
    const next: CarFieldErrors = {};
    for (const issue of issues) {
      next[issue.field] = tValidation(issue.messageKey as CarValidationMessageKey);
    }
    return next;
  }

  function validateForm(): CarFieldErrors | null {
    const issues = collectCarValidationIssues(form);
    if (issues.length === 0) return null;
    const next = stripHiddenFieldErrors(mapIssuesToFieldErrors(issues), businessModel);
    return Object.keys(next).length > 0 ? next : null;
  }

  function updateField<K extends keyof CarFormInput>(key: K, value: CarFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleBusinessModelChange(value: BusinessModel) {
    setForm((prev) => clearFieldsForBusinessModel(prev, value));
    setFieldErrors((prev) => stripHiddenFieldErrors(prev, value));
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const clientFieldErrors = validateForm();
    if (clientFieldErrors) {
      setFieldErrors(clientFieldErrors);
      const firstMessage = Object.values(clientFieldErrors)[0];
      setError(firstMessage ?? tValidation("brandRequired"));
      focusFirstFieldError(clientFieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCarAction(form)
          : await updateCarAction(car!.id, form);

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          const visibleErrors = stripHiddenFieldErrors(result.fieldErrors, businessModel);
          setFieldErrors(visibleErrors);
          focusFirstFieldError(visibleErrors);
        }
        return;
      }

      if (mode === "create" && result.data?.id) {
        router.push(`/cars/${result.data.id}`);
        router.refresh();
        return;
      }

      router.push(`/cars/${car!.id}`);
      router.refresh();
    });
  }

  const financeTitle =
    businessModel === "commission"
      ? t("commissionFinanceTitle")
      : businessModel === "client_order"
        ? t("clientOrderFinanceTitle")
        : t("financeAndDates");

  const fieldClass = (field: keyof CarFormInput) =>
    cn(fieldErrors[field] && "border-red-500 focus-visible:ring-red-500/40");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>{tFields("businessModel")} *</Label>
            <Select value={businessModel} onValueChange={handleBusinessModelChange}>
              <SelectTrigger
                id="business_model"
                data-field="business_model"
                className={fieldClass("business_model")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_MODEL_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateBusinessModel(tBusinessModel, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.business_model} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock_number">{tFields("stockNumber")}</Label>
            <Input
              id="stock_number"
              value={form.stock_number ?? ""}
              onChange={(e) => updateField("stock_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">{tFields("vin")} *</Label>
            <Input
              id="vin"
              value={form.vin ?? ""}
              onChange={(e) => updateField("vin", e.target.value)}
              className={fieldClass("vin")}
              aria-invalid={Boolean(fieldErrors.vin)}
            />
            <FieldError message={fieldErrors.vin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">{tFields("brand")} *</Label>
            <Input
              id="brand"
              value={form.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              className={fieldClass("brand")}
              aria-invalid={Boolean(fieldErrors.brand)}
            />
            <FieldError message={fieldErrors.brand} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">{tFields("model")} *</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(e) => updateField("model", e.target.value)}
              className={fieldClass("model")}
              aria-invalid={Boolean(fieldErrors.model)}
            />
            <FieldError message={fieldErrors.model} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">{tFields("year")} *</Label>
            <Input
              id="year"
              type="number"
              value={form.year}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                updateField("year", Number.isNaN(parsed) ? NaN : parsed);
              }}
              className={fieldClass("year")}
              aria-invalid={Boolean(fieldErrors.year)}
            />
            <FieldError message={fieldErrors.year} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">{tFields("registrationNumber")}</Label>
            <Input
              id="registration_number"
              value={form.registration_number ?? ""}
              onChange={(e) => updateField("registration_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">{tFields("color")}</Label>
            <Input
              id="color"
              value={form.color ?? ""}
              onChange={(e) => updateField("color", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{tFields("status")} *</Label>
            <Select
              value={form.status}
              onValueChange={(value) => updateField("status", value)}
            >
              <SelectTrigger
                id="status"
                data-field="status"
                className={fieldClass("status")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAR_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateStatus(tStatus, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.status} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{financeTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {businessModel === "owned" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">{tFields("purchasePrice")} *</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchase_price ?? ""}
                  onChange={(e) =>
                    updateField("purchase_price", toNumberOrNull(e.target.value))
                  }
                  className={fieldClass("purchase_price")}
                  aria-invalid={Boolean(fieldErrors.purchase_price)}
                />
                <FieldError message={fieldErrors.purchase_price} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">{tFields("plannedSalePrice")}</Label>
                <Input
                  id="sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price ?? ""}
                  onChange={(e) =>
                    updateField("sale_price", toNumberOrNull(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual_sale_price">{tFields("actualSalePrice")}</Label>
                <Input
                  id="actual_sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actual_sale_price ?? ""}
                  onChange={(e) =>
                    updateField("actual_sale_price", toNumberOrNull(e.target.value))
                  }
                />
              </div>
            </>
          ) : null}

          {businessModel === "commission" ? (
            <>
              <div className="space-y-2">
                <Label>{tFields("owner")}</Label>
                <Select
                  value={form.owner_client_id ? String(form.owner_client_id) : "none"}
                  onValueChange={(value) =>
                    updateField(
                      "owner_client_id",
                      value === "none" ? null : Number(value)
                    )
                  }
                >
                  <SelectTrigger
                    id="owner_client_id"
                    data-field="owner_client_id"
                    className={fieldClass("owner_client_id")}
                  >
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
                <FieldError message={fieldErrors.owner_client_id} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_net_amount">{tFields("ownerNetAmount")} *</Label>
                <Input
                  id="owner_net_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.owner_net_amount ?? ""}
                  onChange={(e) =>
                    updateField("owner_net_amount", toNumberOrNull(e.target.value))
                  }
                  className={fieldClass("owner_net_amount")}
                  aria-invalid={Boolean(fieldErrors.owner_net_amount)}
                />
                <FieldError message={fieldErrors.owner_net_amount} />
              </div>
              <div className="space-y-2">
                <Label>{tFields("commissionType")} *</Label>
                <Select
                  value={form.commission_type ?? "none"}
                  onValueChange={(value) =>
                    updateField(
                      "commission_type",
                      value === "none" ? null : (value as CarFormInput["commission_type"])
                    )
                  }
                >
                  <SelectTrigger
                    id="commission_type"
                    data-field="commission_type"
                    className={fieldClass("commission_type")}
                  >
                    <SelectValue placeholder={tFields("notSelected")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tFields("notSelected")}</SelectItem>
                    {COMMISSION_TYPE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {translateCommissionType(tCommissionType, value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={fieldErrors.commission_type} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_value">{tFields("commissionValue")} *</Label>
                <Input
                  id="commission_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commission_value ?? ""}
                  onChange={(e) =>
                    updateField("commission_value", toNumberOrNull(e.target.value))
                  }
                  className={fieldClass("commission_value")}
                  aria-invalid={Boolean(fieldErrors.commission_value)}
                />
                <FieldError message={fieldErrors.commission_value} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_end_date">{tFields("contractEndDate")}</Label>
                <Input
                  id="contract_end_date"
                  type="date"
                  value={form.contract_end_date ?? ""}
                  onChange={(e) =>
                    updateField("contract_end_date", e.target.value || null)
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contract_document_url">{tFields("contractDocument")}</Label>
                <Input
                  id="contract_document_url"
                  type="url"
                  value={form.contract_document_url ?? ""}
                  onChange={(e) => updateField("contract_document_url", e.target.value)}
                />
                <p className="text-xs text-zinc-500">{t("contractDocumentHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_sale_price">{tFields("plannedSalePrice")}</Label>
                <Input
                  id="commission_sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price ?? ""}
                  onChange={(e) =>
                    updateField("sale_price", toNumberOrNull(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_actual_sale_price">
                  {tFields("actualSalePrice")}
                </Label>
                <Input
                  id="commission_actual_sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actual_sale_price ?? ""}
                  onChange={(e) =>
                    updateField("actual_sale_price", toNumberOrNull(e.target.value))
                  }
                />
              </div>
            </>
          ) : null}

          {businessModel === "client_order" ? (
            <>
              <div className="space-y-2">
                <Label>{tFields("commissionType")} *</Label>
                <Select
                  value={form.commission_type ?? "none"}
                  onValueChange={(value) =>
                    updateField(
                      "commission_type",
                      value === "none" ? null : (value as CarFormInput["commission_type"])
                    )
                  }
                >
                  <SelectTrigger
                    id="client_order_commission_type"
                    data-field="commission_type"
                    className={fieldClass("commission_type")}
                  >
                    <SelectValue placeholder={tFields("notSelected")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tFields("notSelected")}</SelectItem>
                    {COMMISSION_TYPE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {translateCommissionType(tCommissionType, value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={fieldErrors.commission_type} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_order_commission_value">
                  {tFields("commissionValue")} *
                </Label>
                <Input
                  id="client_order_commission_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commission_value ?? ""}
                  onChange={(e) =>
                    updateField("commission_value", toNumberOrNull(e.target.value))
                  }
                  className={fieldClass("commission_value")}
                  aria-invalid={Boolean(fieldErrors.commission_value)}
                />
                <FieldError message={fieldErrors.commission_value} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_order_sale_price">{tFields("plannedSalePrice")}</Label>
                <Input
                  id="client_order_sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price ?? ""}
                  onChange={(e) =>
                    updateField("sale_price", toNumberOrNull(e.target.value))
                  }
                  className={fieldClass("sale_price")}
                  aria-invalid={Boolean(fieldErrors.sale_price)}
                />
                <FieldError message={fieldErrors.sale_price} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_order_actual_sale_price">
                  {tFields("actualSalePrice")}
                </Label>
                <Input
                  id="client_order_actual_sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actual_sale_price ?? ""}
                  onChange={(e) =>
                    updateField("actual_sale_price", toNumberOrNull(e.target.value))
                  }
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="purchase_date">{tFields("purchaseDate")}</Label>
            <Input
              id="purchase_date"
              type="date"
              value={form.purchase_date ?? ""}
              onChange={(e) => updateField("purchase_date", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale_date">{tFields("saleDate")}</Label>
            <Input
              id="sale_date"
              type="date"
              value={form.sale_date ?? ""}
              onChange={(e) => updateField("sale_date", e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("relations")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {businessModel !== "commission" ? (
            <div className="space-y-2">
              <Label>
                {tFields("client")}
                {businessModel === "client_order" ? " *" : ""}
              </Label>
              <Select
                value={form.client_id ? String(form.client_id) : "none"}
                onValueChange={(value) =>
                  updateField("client_id", value === "none" ? null : Number(value))
                }
              >
                <SelectTrigger
                  id="client_id"
                  data-field="client_id"
                  className={fieldClass("client_id")}
                >
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
              <FieldError message={fieldErrors.client_id} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{tFields("manager")}</Label>
            <Select
              value={form.manager_id ?? "none"}
              onValueChange={(value) =>
                updateField("manager_id", value === "none" ? null : value)
              }
            >
              <SelectTrigger id="manager_id" data-field="manager_id">
                <SelectValue placeholder={tFields("notSelected")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tFields("notSelected")}</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name ?? profile.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">{tFields("notes")}</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? t("createCar") : t("saveChanges")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          {tActions("cancel")}
        </Button>
      </div>
    </form>
  );
}
