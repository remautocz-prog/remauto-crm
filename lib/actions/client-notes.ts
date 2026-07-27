"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getClientNoteById } from "@/lib/queries/client-notes";
import { createClient } from "@/lib/supabase/server";
import type { ClientNoteFormInput } from "@/lib/types/clients";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createClientNoteAction(
  clientId: number,
  input: ClientNoteFormInput
): Promise<ActionResult> {
  const content = input.content?.trim();
  if (!content) {
    const t = await getTranslations("clients");
    return { success: false, error: t("noteContentRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").insert({
    client_id: clientId,
    content,
    created_by: await getCurrentUserId(),
  });

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function updateClientNoteAction(
  noteId: string,
  input: ClientNoteFormInput
): Promise<ActionResult> {
  const note = await getClientNoteById(noteId);
  if (!note) {
    const t = await getTranslations("clients");
    return { success: false, error: t("noteNotFound") };
  }

  const currentUserId = await getCurrentUserId();
  if (note.created_by && currentUserId && note.created_by !== currentUserId) {
    const t = await getTranslations("clients");
    return { success: false, error: t("noteEditForbidden") };
  }

  const content = input.content?.trim();
  if (!content) {
    const t = await getTranslations("clients");
    return { success: false, error: t("noteContentRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .update({ content })
    .eq("id", noteId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath(`/clients/${note.client_id}`);
  return { success: true };
}

export async function deleteClientNoteAction(noteId: string): Promise<ActionResult> {
  const note = await getClientNoteById(noteId);
  if (!note) {
    const t = await getTranslations("clients");
    return { success: false, error: t("noteNotFound") };
  }

  const currentUserId = await getCurrentUserId();
  if (note.created_by && currentUserId && note.created_by !== currentUserId) {
    const t = await getTranslations("clients");
    return { success: false, error: t("noteDeleteForbidden") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath(`/clients/${note.client_id}`);
  return { success: true };
}
