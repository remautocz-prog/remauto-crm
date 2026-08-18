"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { TERMINAL_DOCUMENT_TASK_STATUSES } from "@/lib/constants/documents";
import { buildChecklistForService } from "@/lib/documents/checklists";
import {
  buildPaymentFields,
  canMarkPaidInFull,
  derivePaymentStatus,
} from "@/lib/documents/payment";
import {
  collectDocumentValidationIssues,
  collectStatusChangeIssues,
  mapDocumentTaskPayload,
  normalizeServiceFormRows,
  type DocumentFieldErrors,
  type DocumentValidationMessageKey,
} from "@/lib/documents/validation";
import { getDocumentFinanceSummary, mapDocumentTask } from "@/lib/documents/helpers";
import { normalizeDocumentPriority } from "@/lib/documents/priority-styles";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { getDocumentTaskById } from "@/lib/queries/documents";
import { createClient } from "@/lib/supabase/server";
import { insertIdentityReturningId } from "@/lib/supabase/safe-insert";
import { guardPermission, guardPermanentDelete } from "@/lib/auth/action-guard";
import { requireAuthenticatedAccess } from "@/lib/auth/access";
import { formatDeleteActionError } from "@/lib/utils/action-errors";
import type {
  DocumentPaymentInput,
  DocumentStatusChangeInput,
  DocumentTaskFormInput,
  DocumentTaskServiceFormInput,
} from "@/lib/types/documents";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

async function mapValidationIssuesToFieldErrors(
  issues: ReturnType<typeof collectDocumentValidationIssues>
): Promise<DocumentFieldErrors> {
  const t = await getTranslations("documents.validation");
  const fieldErrors: DocumentFieldErrors = {};
  for (const issue of issues) {
    fieldErrors[issue.field] = t(issue.messageKey as DocumentValidationMessageKey);
  }
  return fieldErrors;
}

async function mapStatusIssuesToFieldErrors(
  issues: ReturnType<typeof collectStatusChangeIssues>
): Promise<DocumentFieldErrors> {
  const t = await getTranslations("documents.validation");
  const fieldErrors: DocumentFieldErrors = {};
  for (const issue of issues) {
    fieldErrors[issue.field] = t(issue.messageKey as DocumentValidationMessageKey);
  }
  return fieldErrors;
}

function validationFailure<T>(fieldErrors: DocumentFieldErrors): ActionResult<T> {
  const firstError = Object.values(fieldErrors)[0] ?? "Validation failed";
  return { success: false, error: firstError, fieldErrors };
}

function applyPaymentFields<T extends Record<string, unknown>>(
  payload: T,
  input: {
    servicePrice: number | null;
    paidAmount: number;
    paidInFull?: boolean;
    paymentMethod?: string | null;
    existingPaidAt?: string | null;
  }
) {
  const payment = buildPaymentFields({
    servicePrice: input.servicePrice,
    paidAmount: input.paidAmount,
    paidInFull: input.paidInFull,
    paymentMethod: input.paymentMethod,
    existingPaidAt: input.existingPaidAt,
  });
  return { ...payload, ...payment };
}

function finalizeTaskPayload(
  payload: ReturnType<typeof mapDocumentTaskPayload>,
  input: DocumentTaskFormInput,
  existing?: { paid_at?: string | null; payment_method?: string | null }
) {
  return applyPaymentFields(payload, {
    servicePrice: payload.service_price,
    paidAmount: payload.paid_amount,
    paidInFull: input.paid_in_full,
    paymentMethod: input.payment_method ?? existing?.payment_method ?? null,
    existingPaidAt: existing?.paid_at ?? null,
  });
}

function buildServiceRows(taskId: number, services: DocumentTaskServiceFormInput[]) {
  return normalizeServiceFormRows(services)
    .filter((service) => service.service_name.trim())
    .map((service, index) => ({
      ...(service.id ? { id: service.id } : {}),
      document_task_id: taskId,
      service_name: service.service_name.trim(),
      service_price: Number(service.service_price ?? 0),
      cost_price: Number(service.cost_price ?? 0),
      notes: service.notes?.trim() ? service.notes.trim() : null,
      sort_order: index,
    }));
}

async function syncDocumentTaskServices(
  taskId: number,
  services: DocumentTaskServiceFormInput[],
  existingServiceIds: string[]
) {
  const supabase = await createClient();
  const rows = buildServiceRows(taskId, services);
  const nextIds = new Set(rows.map((row) => row.id).filter(Boolean) as string[]);
  const toDelete = existingServiceIds.filter((id) => !nextIds.has(id));

  if (toDelete.length) {
    const { error } = await supabase
      .from("document_task_services")
      .delete()
      .in("id", toDelete);
    if (error) throw error;
  }

  for (const row of rows) {
    const { id, ...payload } = row;
    if (id) {
      const { error } = await supabase
        .from("document_task_services")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("document_task_services").insert(payload);
      if (error) throw error;
    }
  }
}

export async function createDocumentTaskAction(
  input: DocumentTaskFormInput,
  options?: { confirmOverpayment?: boolean }
): Promise<ActionResult<{ id: number }>> {
  const denied = await guardPermission<{ id: number }>("documents.create");
  if (denied) return denied;
  const fieldErrors = await mapValidationIssuesToFieldErrors(
    collectDocumentValidationIssues(input, options)
  );
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const payload = mapDocumentTaskPayload(input);
  if (!payload.required_documents.length && payload.service_type) {
    payload.required_documents = buildChecklistForService(payload.service_type);
  }

  const finalPayload = finalizeTaskPayload(payload, input);

  const supabase = await createClient();
  const { id, error } = await insertIdentityReturningId(
    supabase,
    "document_tasks",
    finalPayload as Record<string, unknown>
  );

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  try {
    await syncDocumentTaskServices(id, input.services ?? [], []);
  } catch (serviceError) {
    await supabase.from("document_tasks").delete().eq("id", id);
    const t = await getTranslations("documents");
    return {
      success: false,
      error: t("serviceSaveFailed"),
    };
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  revalidatePath("/cars");
  if (input.client_id) revalidatePath(`/clients/${input.client_id}`);
  if (input.car_id) revalidatePath(`/cars/${input.car_id}`);

  return { success: true, data: { id } };
}

export async function updateDocumentTaskAction(
  id: number,
  input: DocumentTaskFormInput,
  options?: { confirmOverpayment?: boolean }
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const fieldErrors = await mapValidationIssuesToFieldErrors(
    collectDocumentValidationIssues(input, options)
  );
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const payload = mapDocumentTaskPayload(input);
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }
  const finalPayload = finalizeTaskPayload(payload, input, existing);

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update(finalPayload)
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  try {
    await syncDocumentTaskServices(
      id,
      input.services ?? [],
      (existing?.services ?? []).map((service) => service.id)
    );
  } catch (serviceError) {
    const t = await getTranslations("documents");
    return {
      success: false,
      error: t("serviceSaveFailed"),
    };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  revalidatePath("/cars");
  if (input.client_id) revalidatePath(`/clients/${input.client_id}`);
  if (input.car_id) revalidatePath(`/cars/${input.car_id}`);
  return { success: true };
}

export async function updateDocumentChecklistAction(
  id: number,
  required_documents: DocumentTaskFormInput["required_documents"],
  received_documents: DocumentTaskFormInput["received_documents"]
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({
      required_documents: required_documents ?? [],
      received_documents: received_documents ?? [],
      document_count: required_documents?.length ?? 0,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  return { success: true };
}

export async function changeDocumentStatusAction(
  id: number,
  input: DocumentStatusChangeInput
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const finance = getDocumentFinanceSummary(existing);
  const statusIssues = collectStatusChangeIssues(existing.status, input, finance);
  const fieldErrors = await mapStatusIssuesToFieldErrors(statusIssues);
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const nextStatus = normalizeDocumentTaskStatus(input.status);
  const update: Record<string, unknown> = { status: nextStatus };
  if (input.result_notes?.trim()) {
    update.result_notes = input.result_notes.trim();
  }

  const wasTerminal = TERMINAL_DOCUMENT_TASK_STATUSES.includes(existing.status as never);
  const isTerminal = TERMINAL_DOCUMENT_TASK_STATUSES.includes(nextStatus as never);

  if (nextStatus === "COMPLETED" || nextStatus === "DELIVERED") {
    update.completed_at = existing.completed_at ?? new Date().toISOString().slice(0, 10);
  } else if (wasTerminal && !isTerminal) {
    update.completed_at = null;
  }

  if (nextStatus === "COMPLETED" && !existing.ready_at) {
    update.ready_at = new Date().toISOString();
  }
  if (nextStatus === "DELIVERED" && !existing.delivered_at) {
    update.delivered_at = new Date().toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("document_tasks").update(update).eq("id", id);
  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateDocumentTaskPriorityAction(
  id: number,
  priority: string
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const nextPriority = normalizeDocumentPriority(priority);
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({ priority: nextPriority })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function updateDocumentTaskAssignmentAction(
  id: number,
  assignedTo: string | null
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({ assigned_to: assignedTo })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function updateDocumentTaskDeadlineAction(
  id: number,
  dueDate: string | null
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({ due_date: dueDate })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function registerDocumentPaymentAction(
  id: number,
  input: DocumentPaymentInput
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  if (input.amount <= 0) {
    const t = await getTranslations("documents.validation");
    return { success: false, error: t("paymentAmountRequired") };
  }

  const newPaidAmount = Number(existing.paid_amount ?? 0) + Number(input.amount);
  const finance = getDocumentFinanceSummary(existing);
  const payment = buildPaymentFields({
    servicePrice: finance.servicePrice,
    paidAmount: newPaidAmount,
    paymentMethod: input.payment_method ?? existing.payment_method,
    existingPaidAt: existing.paid_at,
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update(payment)
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  // finance_transactions has no document_task_id — paid_amount only for now
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function markDocumentTaskPaidAction(id: number): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const finance = getDocumentFinanceSummary(existing);
  if (!canMarkPaidInFull(finance.servicePrice)) {
    const t = await getTranslations("documents");
    return { success: false, error: t("markPaidRequiresPrice") };
  }

  const payment = buildPaymentFields({
    servicePrice: finance.servicePrice,
    paidAmount: finance.servicePrice,
    paidInFull: true,
    paymentMethod: existing.payment_method,
    existingPaidAt: existing.paid_at,
  });

  const supabase = await createClient();
  const { error } = await supabase.from("document_tasks").update(payment).eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function updateDocumentTaskPaymentAction(
  id: number,
  input: {
    paid_in_full?: boolean;
    paid_amount?: number;
    payment_method?: string | null;
  },
  options?: { confirmOverpayment?: boolean }
): Promise<ActionResult> {
  const denied = await guardPermission("documents.update");
  if (denied) return denied;
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const finance = getDocumentFinanceSummary(existing);

  const formLike: DocumentTaskFormInput = {
    client_id: existing.client_id,
    car_id: existing.car_id,
    vehicle_mode: existing.vehicle_mode,
    service_type: existing.service_type,
    services: existing.services?.map((service) => ({
      id: service.id,
      service_name: service.service_name,
      service_price: service.service_price,
      cost_price: service.cost_price,
      notes: service.notes,
      sort_order: service.sort_order,
    })),
    status: existing.status,
    priority: existing.priority,
    service_price: finance.servicePrice,
    cost_price: finance.costPrice,
    paid_amount: input.paid_amount ?? existing.paid_amount,
    paid_in_full: input.paid_in_full,
    payment_method: input.payment_method ?? existing.payment_method,
  };

  const fieldErrors = await mapValidationIssuesToFieldErrors(
    collectDocumentValidationIssues(formLike, options)
  );
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const payment = buildPaymentFields({
    servicePrice: finance.servicePrice,
    paidAmount: input.paid_amount ?? existing.paid_amount,
    paidInFull: input.paid_in_full,
    paymentMethod: input.payment_method ?? existing.payment_method,
    existingPaidAt: existing.paid_at,
  });

  const supabase = await createClient();
  const { error } = await supabase.from("document_tasks").update(payment).eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function archiveDocumentTaskAction(id: number): Promise<ActionResult> {
  const denied = await guardPermission("documents.archive");
  if (denied) return denied;

  const access = await requireAuthenticatedAccess();
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  if (access.role === "documents" && existing.assigned_to !== access.userId) {
    const t = await getTranslations("access");
    return { success: false, error: t("permissionDenied") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: access.userId,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath("/documents/dashboard");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function restoreDocumentTaskAction(id: number): Promise<ActionResult> {
  const denied = await guardPermission("documents.archive");
  if (denied) return denied;

  const access = await requireAuthenticatedAccess();
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  if (access.role === "documents" && existing.assigned_to !== access.userId) {
    const t = await getTranslations("access");
    return { success: false, error: t("permissionDenied") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({
      archived_at: null,
      archived_by: null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath("/documents/dashboard");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  return { success: true };
}

export async function deleteDocumentTaskAction(id: number): Promise<ActionResult> {
  const denied = await guardPermanentDelete();
  if (denied) return denied;

  const t = await getTranslations("documents");
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    return { success: false, error: t("taskNotFound") };
  }

  const supabase = await createClient();
  const { error: servicesError } = await supabase
    .from("document_task_services")
    .delete()
    .eq("document_task_id", id);

  if (servicesError) {
    return { success: false, error: await formatDeleteActionError(servicesError) };
  }

  const { error } = await supabase.from("document_tasks").delete().eq("id", id);
  if (error) {
    return { success: false, error: await formatDeleteActionError(error) };
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  if (existing.client_id) revalidatePath(`/clients/${existing.client_id}`);
  if (existing.car_id) revalidatePath(`/cars/${existing.car_id}`);
  return { success: true };
}

export async function getDocumentTaskAction(id: number) {
  const denied = await guardPermission("documents.view");
  if (denied) return null;
  const task = await getDocumentTaskById(id);
  return task ? mapDocumentTask(task as unknown as Record<string, unknown>) : null;
}
