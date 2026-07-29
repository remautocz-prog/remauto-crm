"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { Client, ClientDuplicateMatch, ClientFormInput } from "@/lib/types/clients";
import {
  CLIENT_PREFERRED_LANGUAGE_VALUES,
  CLIENT_TYPE_VALUES,
  DEFAULT_CLIENT_TYPE,
} from "@/lib/constants/clients";
import {
  collectClientValidationIssues,
  type ClientFieldErrors,
  type ClientValidationMessageKey,
} from "@/lib/clients/validation";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { DuplicateWarning } from "@/components/clients/duplicate-warning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translateClientType, translatePreferredLanguage } from "@/lib/i18n/clients";
import { cn } from "@/lib/utils";

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client?: Client;
};

function toFormState(client?: Client): ClientFormInput {
  return {
    client_type: client?.client_type ?? DEFAULT_CLIENT_TYPE,
    full_name: client?.full_name ?? "",
    company: client?.company ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    postal_code: client?.postal_code ?? "",
    country: client?.country ?? "",
    preferred_language: client?.preferred_language ?? null,
    tax_id: client?.tax_id ?? "",
    vat_id: client?.vat_id ?? "",
    birth_date: client?.birth_date ?? "",
    personal_id_number: client?.personal_id_number ?? "",
    identity_document_number: client?.identity_document_number ?? "",
    bank_account: client?.bank_account ?? "",
    notes: client?.notes ?? "",
    is_active: client?.is_active ?? true,
  };
}

function focusFirstFieldError(fieldErrors: ClientFieldErrors) {
  const firstField = Object.keys(fieldErrors)[0];
  if (!firstField) return;
  const element = document.getElementById(`client_${firstField}`);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  element?.focus({ preventScroll: true });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  mode,
  client,
}: ClientFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({});
  const [duplicates, setDuplicates] = useState<ClientDuplicateMatch[]>([]);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  const [form, setForm] = useState<ClientFormInput>(toFormState(client));
  const formRef = useRef<HTMLFormElement>(null);

  const t = useTranslations("clients");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tValidation = useTranslations("clients.validation");
  const tClientType = useTranslations("clientType");
  const tPreferredLanguage = useTranslations("preferredLanguage");

  function updateField<K extends keyof ClientFormInput>(key: K, value: ClientFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDuplicates([]);
    setIgnoreDuplicates(false);
  }

  function validateForm(): ClientFieldErrors | null {
    const issues = collectClientValidationIssues(form);
    if (issues.length === 0) return null;
    const next: ClientFieldErrors = {};
    for (const issue of issues) {
      next[issue.field] = tValidation(issue.messageKey as ClientValidationMessageKey);
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
      const result =
        mode === "create"
          ? await createClientAction(form, { ignoreDuplicates })
          : await updateClientAction(client!.id, form, { ignoreDuplicates });

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          focusFirstFieldError(result.fieldErrors);
        }
        if (result.duplicates?.length) {
          setDuplicates(result.duplicates);
        }
        return;
      }

      onOpenChange(false);
      if (mode === "create" && result.data?.id) {
        router.push(`/clients/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  const fieldClass = (field: keyof ClientFormInput) =>
    cn(fieldErrors[field] && "border-red-500 focus-visible:ring-red-500/40");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setForm(toFormState(client));
          setFieldErrors({});
          setDuplicates([]);
          setIgnoreDuplicates(false);
          setError(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("addClient") : t("editClient")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("addClientDescription") : t("editClientDescription")}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{tFields("clientType")} *</Label>
              <Select
                value={form.client_type}
                onValueChange={(value) =>
                  updateField("client_type", value as ClientFormInput["client_type"])
                }
              >
                <SelectTrigger id="client_client_type" className={fieldClass("client_type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {translateClientType(tClientType, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.client_type === "individual" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_full_name">{tFields("fullName")} *</Label>
                <Input
                  id="client_full_name"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  className={fieldClass("full_name")}
                />
                <FieldError message={fieldErrors.full_name} />
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_company">{tFields("company")} *</Label>
                <Input
                  id="client_company"
                  value={form.company ?? ""}
                  onChange={(e) => updateField("company", e.target.value)}
                  className={fieldClass("company")}
                />
                <FieldError message={fieldErrors.company} />
              </div>
            )}

            {form.client_type === "company" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_full_name">{tFields("contactPerson")}</Label>
                <Input
                  id="client_full_name"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="client_phone">{tFields("phone")}</Label>
              <Input
                id="client_phone"
                value={form.phone ?? ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className={fieldClass("phone")}
              />
              <FieldError message={fieldErrors.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_email">{tFields("email")}</Label>
              <Input
                id="client_email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => updateField("email", e.target.value)}
                className={fieldClass("email")}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client_address">{tFields("address")}</Label>
              <Input
                id="client_address"
                value={form.address ?? ""}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_city">{tFields("city")}</Label>
              <Input
                id="client_city"
                value={form.city ?? ""}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_postal_code">{tFields("postalCode")}</Label>
              <Input
                id="client_postal_code"
                value={form.postal_code ?? ""}
                onChange={(e) => updateField("postal_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_country">{tFields("country")}</Label>
              <Input
                id="client_country"
                value={form.country ?? ""}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{tFields("preferredLanguage")}</Label>
              <Select
                value={form.preferred_language ?? "none"}
                onValueChange={(value) =>
                  updateField(
                    "preferred_language",
                    value === "none" ? null : (value as ClientFormInput["preferred_language"])
                  )
                }
              >
                <SelectTrigger id="client_preferred_language">
                  <SelectValue placeholder={tFields("notSelected")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tFields("notSelected")}</SelectItem>
                  {CLIENT_PREFERRED_LANGUAGE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {translatePreferredLanguage(tPreferredLanguage, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_tax_id">{tFields("taxId")}</Label>
              <Input
                id="client_tax_id"
                value={form.tax_id ?? ""}
                onChange={(e) => updateField("tax_id", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_vat_id">{tFields("vatId")}</Label>
              <Input
                id="client_vat_id"
                value={form.vat_id ?? ""}
                onChange={(e) => updateField("vat_id", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client_bank_account">{t("bankAccount")}</Label>
              <Input
                id="client_bank_account"
                value={form.bank_account ?? ""}
                onChange={(e) => updateField("bank_account", e.target.value)}
              />
            </div>

            {form.client_type === "individual" ? (
              <>
                <div className="md:col-span-2 mt-2 border-t border-zinc-800 pt-4">
                  <p className="text-sm font-medium text-zinc-300">{t("privateInformation")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_birth_date">{t("birthDate")}</Label>
                  <Input
                    id="client_birth_date"
                    type="date"
                    value={form.birth_date ?? ""}
                    onChange={(e) => updateField("birth_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_personal_id">{t("personalIdNumber")}</Label>
                  <Input
                    id="client_personal_id"
                    value={form.personal_id_number ?? ""}
                    onChange={(e) => updateField("personal_id_number", e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">{t("personalIdHelp")}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="client_identity_document">{t("identityDocumentNumber")}</Label>
                  <Input
                    id="client_identity_document"
                    value={form.identity_document_number ?? ""}
                    onChange={(e) => updateField("identity_document_number", e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">{t("identityDocumentHelp")}</p>
                </div>
              </>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client_notes">{tFields("notes")}</Label>
              <Textarea
                id="client_notes"
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>

          <DuplicateWarning duplicates={duplicates} />

          {duplicates.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={ignoreDuplicates}
                onChange={(e) => setIgnoreDuplicates(e.target.checked)}
              />
              {t("duplicateContinue")}
            </label>
          ) : null}

          {error ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {tActions("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || (duplicates.length > 0 && !ignoreDuplicates)}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {mode === "create" ? t("createClient") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
