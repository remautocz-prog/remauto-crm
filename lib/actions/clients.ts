"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { findClientDuplicates } from "@/lib/clients/duplicates";
import {
  collectClientValidationIssues,
  normalizeClientPayload,
  type ClientFieldErrors,
  type ClientValidationMessageKey,
} from "@/lib/clients/validation";
import {
  getAllClientsForDuplicateCheck,
} from "@/lib/queries/clients";
import { createClient } from "@/lib/supabase/server";
import type { ClientDuplicateMatch, ClientFormInput } from "@/lib/types/clients";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

async function mapValidationIssuesToFieldErrors(
  issues: ReturnType<typeof collectClientValidationIssues>
): Promise<ClientFieldErrors> {
  const t = await getTranslations("clients.validation");
  const fieldErrors: ClientFieldErrors = {};

  for (const issue of issues) {
    fieldErrors[issue.field] = t(issue.messageKey as ClientValidationMessageKey);
  }

  return fieldErrors;
}

function validationFailure<T>(
  fieldErrors: ClientFieldErrors,
  duplicates?: ClientDuplicateMatch[]
): ActionResult<T> {
  const firstError = Object.values(fieldErrors)[0] ?? "Validation failed";
  return { success: false, error: firstError, fieldErrors, duplicates };
}

export async function checkClientDuplicatesAction(
  input: ClientFormInput,
  excludeId?: number
): Promise<ActionResult<{ duplicates: ClientDuplicateMatch[] }>> {
  const existingClients = await getAllClientsForDuplicateCheck(excludeId);
  const duplicates = findClientDuplicates(input, existingClients, excludeId);
  return { success: true, data: { duplicates } };
}

export async function createClientAction(
  input: ClientFormInput,
  options?: { ignoreDuplicates?: boolean }
): Promise<ActionResult<{ id: number; duplicates?: ClientDuplicateMatch[] }>> {
  const fieldErrors = await mapValidationIssuesToFieldErrors(
    collectClientValidationIssues(input)
  );
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const existingClients = await getAllClientsForDuplicateCheck();
  const duplicates = findClientDuplicates(input, existingClients);
  if (duplicates.length > 0 && !options?.ignoreDuplicates) {
    const t = await getTranslations("clients");
    return {
      success: false,
      error: t("duplicateWarningTitle"),
      duplicates,
    };
  }

  const payload = normalizeClientPayload(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(payload as Record<string, unknown>)
    .select("id")
    .single();

  if (error) {
    console.error("[createClientAction] Supabase insert failed:", error, payload);
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return {
    success: true,
    data: { id: data.id, duplicates: duplicates.length ? duplicates : undefined },
  };
}

export async function updateClientAction(
  id: number,
  input: ClientFormInput,
  options?: { ignoreDuplicates?: boolean }
): Promise<ActionResult> {
  const fieldErrors = await mapValidationIssuesToFieldErrors(
    collectClientValidationIssues(input)
  );
  if (Object.keys(fieldErrors).length > 0) {
    return validationFailure(fieldErrors);
  }

  const existingClients = await getAllClientsForDuplicateCheck(id);
  const duplicates = findClientDuplicates(input, existingClients, id);
  if (duplicates.length > 0 && !options?.ignoreDuplicates) {
    const t = await getTranslations("clients");
    return {
      success: false,
      error: t("duplicateWarningTitle"),
      duplicates,
    };
  }

  const payload = normalizeClientPayload(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(payload as Record<string, unknown>)
    .eq("id", id);

  if (error) {
    console.error("[updateClientAction] Supabase update failed:", error, payload);
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function archiveClientAction(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[archiveClientAction] Supabase update failed:", error);
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/clients");
}

export async function unarchiveClientAction(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_active: true })
    .eq("id", id);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function linkCarToClientAction(
  clientId: number,
  carId: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cars")
    .update({ client_id: clientId })
    .eq("id", carId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
  return { success: true };
}

export async function deleteClientAction(id: number): Promise<ActionResult> {
  return archiveClientAction(id);
}
