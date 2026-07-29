import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";
import { resolveDataSourceMode } from "@/lib/constants/document-template-data-source";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedDocument } from "@/lib/types/document-templates";

function mapGenerated(row: Record<string, unknown>): GeneratedDocument {
  const template = row.document_templates as
    | { id: string; name: string; category: string; data_source_mode?: string | null }
    | null
    | undefined;
  const generator = row.generator as
    | { id: string; full_name: string | null }
    | null
    | undefined;

  return {
    id: String(row.id),
    template_id: (row.template_id as string | null) ?? null,
    client_id: row.client_id != null ? Number(row.client_id) : null,
    vehicle_id: row.vehicle_id != null ? Number(row.vehicle_id) : null,
    document_task_id:
      row.document_task_id != null ? Number(row.document_task_id) : null,
    deal_id: (row.deal_id as string | null) ?? null,
    generated_by: (row.generated_by as string | null) ?? null,
    language: row.language as GeneratedDocument["language"],
    document_name: String(row.document_name),
    docx_storage_path: (row.docx_storage_path as string | null) ?? null,
    pdf_storage_path: (row.pdf_storage_path as string | null) ?? null,
    snapshot_data: (row.snapshot_data as Record<string, unknown>) ?? {},
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: String(row.created_at),
    template: template
      ? {
          id: String(template.id),
          name: String(template.name),
          category: template.category as DocumentTemplateCategory,
          data_source_mode: resolveDataSourceMode(
            template.category as DocumentTemplateCategory,
            template.data_source_mode
          ),
        }
      : null,
    generator: generator ?? null,
  };
}

export async function getGeneratedDocuments(filters: {
  clientId?: number;
  vehicleId?: number;
  documentTaskId?: number;
  dealId?: string;
  includeArchived?: boolean;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("generated_documents")
    .select(
      `
      *,
      document_templates:template_id ( id, name, category, data_source_mode ),
      generator:generated_by ( id, full_name )
    `
    )
    .order("created_at", { ascending: false });

  if (filters.clientId != null) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters.vehicleId != null) {
    query = query.eq("vehicle_id", filters.vehicleId);
  }
  if (filters.documentTaskId != null) {
    query = query.eq("document_task_id", filters.documentTaskId);
  }
  if (filters.dealId) {
    query = query.eq("deal_id", filters.dealId);
  }
  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }

  query = query.limit(filters.limit ?? 50);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapGenerated(row as Record<string, unknown>));
}

export async function getGeneratedDocumentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_documents")
    .select(
      `
      *,
      document_templates:template_id ( id, name, category, data_source_mode ),
      generator:generated_by ( id, full_name )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapGenerated(data as Record<string, unknown>);
}
