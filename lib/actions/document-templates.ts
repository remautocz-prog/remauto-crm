"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import {
  DOCUMENT_TEMPLATE_CATEGORIES,
  DOCUMENT_TEMPLATE_LANGUAGES,
  DOCUMENT_TEMPLATE_MAX_BYTES,
} from "@/lib/constants/document-templates";
import {
  DATA_SOURCE_MODES,
  DEFAULT_DATA_SOURCE_BY_CATEGORY,
  resolveDataSourceMode,
} from "@/lib/constants/document-template-data-source";
import {
  extractPlaceholdersFromDocx,
  sanitizeDocumentFilename,
} from "@/lib/documents/template-engine";
import { classifyPlaceholders } from "@/lib/documents/template-placeholders";
import {
  countGeneratedDocumentsForTemplate,
  getDocumentTemplateById,
} from "@/lib/queries/document-templates";
import {
  removeStorageFile,
  uploadTemplateFile,
} from "@/lib/storage/document-storage";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentTemplateCategory,
  DocumentTemplateLanguage,
} from "@/lib/constants/document-templates";
import type { CompanySettings } from "@/lib/types/document-templates";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

function isDocxFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".docx") &&
    (file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/octet-stream" ||
      file.type === "")
  );
}

export async function updateCompanySettingsAction(
  input: Partial<Omit<CompanySettings, "id" | "updated_at">>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_settings")
    .update({
      name: input.name ?? null,
      ico: input.ico ?? null,
      dic: input.dic ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      postal_code: input.postal_code ?? null,
      country: input.country ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      bank_account: input.bank_account ?? null,
    })
    .eq("id", 1);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/templates");
  return { success: true };
}

export async function createDocumentTemplateAction(formData: FormData): Promise<
  ActionResult<{ id: string; recognized: string[]; unknown: string[] }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as DocumentTemplateCategory;
  const language = String(formData.get("language") ?? "") as DocumentTemplateLanguage;
  const description = String(formData.get("description") ?? "").trim() || null;
  const dataSourceModeInput = String(formData.get("data_source_mode") ?? "").trim();
  const file = formData.get("file");

  if (!name) {
    return { success: false, error: "Template name is required" };
  }
  if (!DOCUMENT_TEMPLATE_CATEGORIES.includes(category)) {
    return { success: false, error: "Invalid template category" };
  }
  if (!DOCUMENT_TEMPLATE_LANGUAGES.includes(language)) {
    return { success: false, error: "Invalid template language" };
  }
  const dataSourceMode = DATA_SOURCE_MODES.includes(
    dataSourceModeInput as (typeof DATA_SOURCE_MODES)[number]
  )
    ? (dataSourceModeInput as (typeof DATA_SOURCE_MODES)[number])
    : DEFAULT_DATA_SOURCE_BY_CATEGORY[category];
  if (!(file instanceof File)) {
    return { success: false, error: "DOCX file is required" };
  }
  if (!isDocxFile(file)) {
    return { success: false, error: "Only DOCX templates are supported" };
  }
  if (file.size > DOCUMENT_TEMPLATE_MAX_BYTES) {
    return { success: false, error: "Template file is too large" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let placeholders: string[] = [];
  try {
    placeholders = extractPlaceholdersFromDocx(buffer);
  } catch {
    return { success: false, error: "Template validation failed" };
  }

  const { recognized, unknown } = classifyPlaceholders(placeholders);
  const templateId = randomUUID();
  let storagePath: string;

  try {
    storagePath = await uploadTemplateFile({
      templateId,
      filename: file.name,
      buffer,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Storage upload failed",
    };
  }

  const { error } = await supabase.from("document_templates").insert({
    id: templateId,
    name,
    category,
    language,
    storage_path: storagePath,
    original_filename: sanitizeDocumentFilename(file.name),
    description,
    recognized_placeholders: recognized,
    data_source_mode: dataSourceMode,
    is_active: true,
    created_by: user.id,
  });

  if (error) {
    await removeStorageFile("templates", storagePath).catch(() => undefined);
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/settings/templates");
  return { success: true, data: { id: templateId, recognized, unknown } };
}

export async function archiveDocumentTemplateAction(
  templateId: string,
  archived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_templates")
    .update({ is_active: !archived })
    .eq("id", templateId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/settings/templates");
  return { success: true };
}

export async function duplicateDocumentTemplateAction(
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  const template = await getDocumentTemplateById(templateId);
  if (!template) {
    return { success: false, error: "Template not found" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const newId = randomUUID();
  const { downloadTemplateFile, uploadTemplateFile: uploadCopy } = await import(
    "@/lib/storage/document-storage"
  );

  try {
    const buffer = await downloadTemplateFile(template.storage_path);
    const storagePath = await uploadCopy({
      templateId: newId,
      filename: template.original_filename,
      buffer,
    });

    const { error } = await supabase.from("document_templates").insert({
      id: newId,
      name: `${template.name} (copy)`,
      category: template.category,
      language: template.language,
      storage_path: storagePath,
      original_filename: template.original_filename,
      description: template.description,
      recognized_placeholders: template.recognized_placeholders,
      data_source_mode: template.data_source_mode,
      is_active: true,
      created_by: user.id,
    });

    if (error) throw error;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Duplicate failed",
    };
  }

  revalidatePath("/settings/templates");
  return { success: true, data: { id: newId } };
}

export async function updateDocumentTemplateMetadataAction(input: {
  templateId: string;
  name: string;
  category: DocumentTemplateCategory;
  language: DocumentTemplateLanguage;
  description?: string | null;
  data_source_mode: (typeof DATA_SOURCE_MODES)[number];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const name = input.name.trim();
  if (!name) return { success: false, error: "Template name is required" };
  if (!DOCUMENT_TEMPLATE_CATEGORIES.includes(input.category)) {
    return { success: false, error: "Invalid template category" };
  }
  if (!DOCUMENT_TEMPLATE_LANGUAGES.includes(input.language)) {
    return { success: false, error: "Invalid template language" };
  }
  if (!DATA_SOURCE_MODES.includes(input.data_source_mode)) {
    return { success: false, error: "Invalid data source mode" };
  }

  const { error } = await supabase
    .from("document_templates")
    .update({
      name,
      category: input.category,
      language: input.language,
      description: input.description?.trim() || null,
      data_source_mode: input.data_source_mode,
    })
    .eq("id", input.templateId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/settings/templates");
  return { success: true };
}

export async function validateTemplateFileAction(
  formData: FormData
): Promise<ActionResult<{ recognized: string[]; unknown: string[] }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "DOCX file is required" };
  }
  if (!isDocxFile(file)) {
    return { success: false, error: "Only DOCX templates are supported" };
  }
  if (file.size > DOCUMENT_TEMPLATE_MAX_BYTES) {
    return { success: false, error: "Template file is too large" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const placeholders = extractPlaceholdersFromDocx(buffer);
    const { recognized, unknown } = classifyPlaceholders(placeholders);
    return { success: true, data: { recognized, unknown } };
  } catch {
    return { success: false, error: "Template validation failed" };
  }
}

export async function deleteDocumentTemplateAction(
  templateId: string
): Promise<ActionResult> {
  const generatedCount = await countGeneratedDocumentsForTemplate(templateId);
  if (generatedCount > 0) {
    return {
      success: false,
      error: "Template has generated documents; archive it instead",
    };
  }

  const template = await getDocumentTemplateById(templateId);
  if (!template) {
    return { success: false, error: "Template not found" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  await removeStorageFile("templates", template.storage_path).catch(() => undefined);
  revalidatePath("/settings/templates");
  return { success: true };
}
