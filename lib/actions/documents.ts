"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildChecklistForService } from "@/lib/documents/checklists";
import {
  buildPaymentFields,
  derivePaymentStatus,
} from "@/lib/documents/payment";
import {
  getDocumentFinanceSummary,
  mapDocumentTask,
} from "@/lib/documents/helpers";
import {
  collectDocumentValidationIssues,
  collectStatusChangeIssues,
  mapDocumentTaskPayload,
  type DocumentFieldErrors,
  type DocumentValidationMessageKey,
} from "@/lib/documents/validation";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { getDocumentTaskById } from "@/lib/queries/documents";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentPaymentInput,
  DocumentStatusChangeInput,
  DocumentTaskFormInput,
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

export async function createDocumentTaskAction(
  input: DocumentTaskFormInput,
  options?: { confirmOverpayment?: boolean }
): Promise<ActionResult<{ id: number }>> {
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
  const { data, error } = await supabase
    .from("document_tasks")
    .insert(finalPayload)
    .select("id")
    .single();

  if (error) {
    console.error("[createDocumentTaskAction]", error, finalPayload);
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  revalidatePath("/cars");
  if (input.client_id) revalidatePath(`/clients/${input.client_id}`);
  if (input.car_id) revalidatePath(`/cars/${input.car_id}`);

  return { success: true, data: { id: data.id } };
}

export async function updateDocumentTaskAction(
  id: number,
  input: DocumentTaskFormInput,
  options?: { confirmOverpayment?: boolean }
): Promise<ActionResult> {
  const fieldErrors = await mapValidationIssuesToFieldErrors(
    collectDocumentValidationIssues(input, options)
  );
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const payload = mapDocumentTaskPayload(input);
  const existing = await getDocumentTaskById(id);
  const finalPayload = finalizeTaskPayload(payload, input, existing ?? undefined);

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update(finalPayload)
    .eq("id", id);

  if (error) {
    console.error("[updateDocumentTaskAction]", error, finalPayload);
    return { success: false, error: await formatSupabaseError(error) };
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
  if (nextStatus === "COMPLETED" || nextStatus === "DELIVERED") {
    update.completed_at = existing.completed_at ?? new Date().toISOString().slice(0, 10);
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

export async function registerDocumentPaymentAction(
  id: number,
  input: DocumentPaymentInput
): Promise<ActionResult> {
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
  const servicePrice = existing.service_price;
  const payment = buildPaymentFields({
    servicePrice,
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
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  if (existing.service_price == null || Number(existing.service_price) < 0) {
    const t = await getTranslations("documents");
    return { success: false, error: t("markPaidRequiresPrice") };
  }

  const payment = buildPaymentFields({
    servicePrice: existing.service_price,
    paidAmount: Number(existing.service_price),
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
  const existing = await getDocumentTaskById(id);
  if (!existing) {
    const t = await getTranslations("documents");
    return { success: false, error: t("taskNotFound") };
  }

  const formLike: DocumentTaskFormInput = {
    client_id: existing.client_id,
    car_id: existing.car_id,
    vehicle_mode: existing.vehicle_mode,
    service_type: existing.service_type,
    status: existing.status,
    priority: existing.priority,
    service_price: existing.service_price,
    cost_price: existing.cost_price,
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
    servicePrice: existing.service_price,
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect("/documents");
}

export async function restoreDocumentTaskAction(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_tasks")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getDocumentTaskAction(id: number) {
  const task = await getDocumentTaskById(id);
  return task ? mapDocumentTask(task as unknown as Record<string, unknown>) : null;
}
