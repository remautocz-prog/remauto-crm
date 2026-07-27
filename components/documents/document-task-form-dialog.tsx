"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { ClientOption, Profile } from "@/lib/types/cars";
import type { DocumentTask, DocumentTaskFormInput } from "@/lib/types/documents";
import {
  DEFAULT_DOCUMENT_PRIORITY,
  DEFAULT_DOCUMENT_STATUS,
  DOCUMENT_PRIORITY_VALUES,
  DOCUMENT_TASK_STATUS_VALUES,
} from "@/lib/constants/documents";
import { buildChecklistForService } from "@/lib/documents/checklists";
import {
  DEFAULT_DOCUMENT_VEHICLE_MODE,
  resolveDocumentVehicleMode,
  type DocumentCarOption,
} from "@/lib/documents/vehicle";
import {
  collectDocumentValidationIssues,
  focusFirstFieldError,
  type DocumentFieldErrors,
  type DocumentValidationMessageKey,
} from "@/lib/documents/validation";
import { DocumentPaymentFields } from "@/components/documents/document-payment-fields";
import { DocumentServiceSelect } from "@/components/documents/document-service-select";
import { DocumentVehicleFields } from "@/components/documents/document-vehicle-fields";
import { inferPaidInFull } from "@/lib/documents/payment";
import {
  createDocumentTaskAction,
  updateDocumentTaskAction,
} from "@/lib/actions/documents";
import { DocumentChecklist } from "@/components/documents/document-checklist";
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
import { translateDocumentStatus } from "@/lib/i18n/documents";
import { cn } from "@/lib/utils";

type DocumentTaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  task?: DocumentTask;
  clients: ClientOption[];
  cars: DocumentCarOption[];
  profiles: Profile[];
  initialClientId?: number | null;
  initialCarId?: number | null;
};

function toFormState(
  task?: DocumentTask,
  initialClientId?: number | null,
  initialCarId?: number | null
): DocumentTaskFormInput {
  const vehicleMode = task
    ? resolveDocumentVehicleMode(task)
    : initialCarId
      ? "crm"
      : DEFAULT_DOCUMENT_VEHICLE_MODE;

  return {
    client_id: task?.client_id ?? initialClientId ?? null,
    car_id: vehicleMode === "crm" ? task?.car_id ?? initialCarId ?? null : null,
    vehicle_mode: vehicleMode,
    vehicle_vin: task?.vehicle_vin ?? "",
    vehicle_plate: task?.vehicle_plate ?? "",
    vehicle_brand: task?.vehicle_brand ?? "",
    vehicle_model: task?.vehicle_model ?? "",
    vehicle_year: task?.vehicle_year ?? null,
    service_type: task?.service_type ?? task?.work_type ?? null,
    custom_service_name: task?.custom_service_name ?? "",
    assigned_to: task?.assigned_to ?? null,
    status: task?.status ?? DEFAULT_DOCUMENT_STATUS,
    priority: task?.priority ?? DEFAULT_DOCUMENT_PRIORITY,
    started_at: task?.started_at ?? "",
    due_date: task?.due_date ?? task?.deadline ?? "",
    service_price: task?.service_price ?? null,
    cost_price: task?.cost_price ?? null,
    paid_amount: task?.paid_amount ?? 0,
    paid_in_full: task ? inferPaidInFull(task) : false,
    payment_method: task?.payment_method ?? null,
    document_count: task?.document_count ?? 0,
    required_documents: task?.required_documents ?? [],
    received_documents: task?.received_documents ?? [],
    notes: task?.notes ?? "",
    result_notes: task?.result_notes ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function DocumentTaskFormDialog({
  open,
  onOpenChange,
  mode,
  task,
  clients,
  cars,
  profiles,
  initialClientId,
  initialCarId,
}: DocumentTaskFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DocumentFieldErrors>({});
  const [confirmOverpayment, setConfirmOverpayment] = useState(false);
  const [form, setForm] = useState<DocumentTaskFormInput>(
    toFormState(task, initialClientId, initialCarId)
  );
  const formRef = useRef<HTMLFormElement>(null);

  const t = useTranslations("documents");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tValidation = useTranslations("documents.validation");
  const tStatus = useTranslations("documents.status");
  const tPriority = useTranslations("documents.priority");

  useEffect(() => {
    if (open) {
      setForm(toFormState(task, initialClientId, initialCarId));
      setFieldErrors({});
      setConfirmOverpayment(false);
      setError(null);
    }
  }, [open, task, initialClientId, initialCarId]);

  const filteredCars = cars;

  function updateField<K extends keyof DocumentTaskFormInput>(
    key: K,
    value: DocumentTaskFormInput[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "client_id") {
        const clientId = value as number | null;
        if (
          next.vehicle_mode === "crm" &&
          next.car_id &&
          !cars.some(
            (car) =>
              car.id === next.car_id &&
              (car.client_id === clientId || car.client_id == null)
          )
        ) {
          next.car_id = null;
        }
      }
      if (key === "service_type" && value && value !== "custom") {
        next.required_documents = buildChecklistForService(String(value));
        next.custom_service_name = "";
      }
      return next;
    });
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateForm(): DocumentFieldErrors | null {
    const issues = collectDocumentValidationIssues(form, { confirmOverpayment });
    if (issues.length === 0) return null;
    const next: DocumentFieldErrors = {};
    for (const issue of issues) {
      next[issue.field] = tValidation(issue.messageKey as DocumentValidationMessageKey);
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const nextErrors = validateForm();
    if (nextErrors) {
      setFieldErrors(nextErrors);
      setError(Object.values(nextErrors)[0] ?? null);
      focusFirstFieldError(nextErrors);
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createDocumentTaskAction(form, { confirmOverpayment })
          : await updateDocumentTaskAction(task!.id, form, { confirmOverpayment });

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          focusFirstFieldError(result.fieldErrors);
        }
        return;
      }

      onOpenChange(false);
      if (mode === "create" && result.data?.id) {
        router.push(`/documents/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  const fieldClass = (field: keyof DocumentTaskFormInput | "paid_in_full") =>
    cn(fieldErrors[field as keyof DocumentFieldErrors] && "border-red-500 focus-visible:ring-red-500/40");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTask") : t("editTask")}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("createTaskDescription") : t("editTaskDescription")}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{tFields("client")} *</Label>
              <Select
                value={form.client_id ? String(form.client_id) : "none"}
                onValueChange={(value) =>
                  updateField("client_id", value === "none" ? null : Number(value))
                }
              >
                <SelectTrigger id="document_client_id" className={fieldClass("client_id")}>
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

            <DocumentVehicleFields
              form={form}
              cars={filteredCars}
              onChange={updateField}
              fieldClass={fieldClass}
              fieldErrors={fieldErrors}
            />

            <div className="space-y-2">
              <Label htmlFor="document_service_type">{tFields("service")} *</Label>
              <DocumentServiceSelect
                id="document_service_type"
                value={form.service_type}
                onChange={(value) => updateField("service_type", value)}
                className={fieldClass("service_type")}
                error={Boolean(fieldErrors.service_type)}
              />
              <FieldError message={fieldErrors.service_type} />
            </div>

            {form.service_type === "custom" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="document_custom_service_name">{t("customServiceName")} *</Label>
                <Input
                  id="document_custom_service_name"
                  value={form.custom_service_name ?? ""}
                  onChange={(e) => updateField("custom_service_name", e.target.value)}
                  className={fieldClass("custom_service_name")}
                />
                <FieldError message={fieldErrors.custom_service_name} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>{tFields("manager")}</Label>
              <Select
                value={form.assigned_to ?? "none"}
                onValueChange={(value) =>
                  updateField("assigned_to", value === "none" ? null : value)
                }
              >
                <SelectTrigger id="document_assigned_to">
                  <SelectValue placeholder={t("unassigned")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("unassigned")}</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name ?? profile.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tFields("status")}</Label>
              <Select
                value={form.status}
                onValueChange={(value) => updateField("status", value)}
              >
                <SelectTrigger id="document_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TASK_STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {translateDocumentStatus(tStatus, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("priorityLabel")}</Label>
              <Select
                value={form.priority as string}
                onValueChange={(value) => updateField("priority", value)}
              >
                <SelectTrigger id="document_priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_PRIORITY_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tPriority(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_started_at">{t("startDate")}</Label>
              <Input
                id="document_started_at"
                type="date"
                value={form.started_at ?? ""}
                onChange={(e) => updateField("started_at", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_due_date">{t("dueDate")}</Label>
              <Input
                id="document_due_date"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => updateField("due_date", e.target.value)}
                className={fieldClass("due_date")}
              />
              <FieldError message={fieldErrors.due_date} />
            </div>

            <DocumentPaymentFields
              form={form}
              onChange={updateField}
              fieldClass={fieldClass}
              fieldErrors={fieldErrors}
            />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="document_notes">{tFields("notes")}</Label>
              <Textarea
                id="document_notes"
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>

          {form.required_documents && form.required_documents.length > 0 && mode === "edit" && task?.id ? (
            <DocumentChecklist
              taskId={task.id}
              required={form.required_documents}
              received={form.received_documents ?? []}
            />
          ) : null}

          {fieldErrors.paid_amount?.includes(tValidation("paidAmountExceedsPrice")) ? (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={confirmOverpayment}
                onChange={(e) => setConfirmOverpayment(e.target.checked)}
              />
              {t("confirmOverpayment")}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {mode === "create" ? t("createTask") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
