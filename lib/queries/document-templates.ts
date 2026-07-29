import { createClient } from "@/lib/supabase/server";
import { resolveDataSourceMode } from "@/lib/constants/document-template-data-source";
import type {
  CompanySettings,
  DocumentTemplate,
} from "@/lib/types/document-templates";

function mapTemplate(row: Record<string, unknown>): DocumentTemplate {
  const category = row.category as DocumentTemplate["category"];
  return {
    id: String(row.id),
    name: String(row.name),
    category,
    language: row.language as DocumentTemplate["language"],
    data_source_mode: resolveDataSourceMode(
      category,
      row.data_source_mode as string | null | undefined
    ),
    storage_path: String(row.storage_path),
    original_filename: String(row.original_filename),
    description: (row.description as string | null) ?? null,
    recognized_placeholders: Array.isArray(row.recognized_placeholders)
      ? (row.recognized_placeholders as string[])
      : [],
    is_active: row.is_active !== false,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;

  return {
    id: 1,
    name: (data?.name as string | null) ?? null,
    ico: (data?.ico as string | null) ?? null,
    dic: (data?.dic as string | null) ?? null,
    address: (data?.address as string | null) ?? null,
    city: (data?.city as string | null) ?? null,
    postal_code: (data?.postal_code as string | null) ?? null,
    country: (data?.country as string | null) ?? null,
    phone: (data?.phone as string | null) ?? null,
    email: (data?.email as string | null) ?? null,
    bank_account: (data?.bank_account as string | null) ?? null,
    updated_at: String(data?.updated_at ?? new Date().toISOString()),
  };
}

export async function getDocumentTemplates(options?: {
  includeArchived?: boolean;
  language?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from("document_templates").select("*").order("name");

  if (!options?.includeArchived) {
    query = query.eq("is_active", true);
  }

  if (options?.language) {
    query = query.eq("language", options.language);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapTemplate(row as Record<string, unknown>));
}

export async function getDocumentTemplateById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapTemplate(data as Record<string, unknown>);
}

export async function countGeneratedDocumentsForTemplate(templateId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("generated_documents")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  if (error) throw error;
  return count ?? 0;
}
