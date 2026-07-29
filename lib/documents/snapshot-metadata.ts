import type { DataSourceMode } from "@/lib/constants/document-template-data-source";
import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";
import type {
  DocumentTemplateData,
  DocumentTemplateOverrides,
} from "@/lib/types/document-templates";

export type GeneratedDocumentSnapshotMeta = {
  template_id: string;
  template_category: DocumentTemplateCategory;
  template_data_source_mode: DataSourceMode;
  linked_client_id: number | null;
  linked_vehicle_id: number | null;
  linked_deal_id: string | null;
  linked_document_task_id: number | null;
  manual_overrides: DocumentTemplateOverrides;
  overridden_field_paths: string[];
  generated_at: string;
  generated_by: string;
};

export function attachSnapshotMetadata(
  snapshot: DocumentTemplateData,
  meta: GeneratedDocumentSnapshotMeta
): DocumentTemplateData {
  return {
    ...snapshot,
    _generation_meta: meta,
  };
}

export function getSnapshotMetadata(
  snapshot: Record<string, unknown>
): GeneratedDocumentSnapshotMeta | null {
  const raw = snapshot._generation_meta;
  if (!raw || typeof raw !== "object") return null;
  return raw as GeneratedDocumentSnapshotMeta;
}
