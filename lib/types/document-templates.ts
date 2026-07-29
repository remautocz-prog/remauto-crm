import type { DocumentTemplateCategory, DocumentTemplateLanguage } from "@/lib/constants/document-templates";
import type { DataSourceMode } from "@/lib/constants/document-template-data-source";

export type CompanySettings = {
  id: number;
  name: string | null;
  ico: string | null;
  dic: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  updated_at: string;
};

export type DocumentTemplate = {
  id: string;
  name: string;
  category: DocumentTemplateCategory;
  language: DocumentTemplateLanguage;
  data_source_mode: DataSourceMode;
  storage_path: string;
  original_filename: string;
  description: string | null;
  recognized_placeholders: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneratedDocument = {
  id: string;
  template_id: string | null;
  client_id: number | null;
  vehicle_id: number | null;
  document_task_id: number | null;
  deal_id: string | null;
  generated_by: string | null;
  language: DocumentTemplateLanguage;
  document_name: string;
  docx_storage_path: string | null;
  pdf_storage_path: string | null;
  snapshot_data: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  template?: Pick<DocumentTemplate, "id" | "name" | "category" | "data_source_mode"> | null;
  generator?: { id: string; full_name: string | null } | null;
};

export type DocumentTemplateOverrides = {
  company?: Partial<Record<string, string>>;
  client?: Partial<Record<string, string>>;
  customer?: Partial<Record<string, string>>;
  vehicle?: Partial<Record<string, string>>;
  order?: Partial<Record<string, string>>;
  document?: Partial<Record<string, string>>;
  employee?: Partial<Record<string, string>>;
  deal?: Partial<Record<string, string>>;
  vehicle_a?: Partial<Record<string, string>>;
  vehicle_b?: Partial<Record<string, string>>;
  payment?: Partial<Record<string, string>>;
  registration?: Partial<Record<string, string>>;
  service?: Partial<Record<string, string>>;
  handover?: {
    delivery_date?: string;
    date?: string;
    delivery_place?: string;
    place?: string;
    deliverer_name?: string;
    receiver_name?: string;
    notes?: string;
    notes_continued?: string;
    vehicle_a?: Partial<Record<string, string>>;
    vehicle_b?: Partial<Record<string, string>>;
  };
};

export type PowerOfAttorneyTemplateSection = {
  principal: Record<string, string>;
  authorized_person: Record<string, string>;
  vehicle: Record<string, string>;
  authorization: Record<string, string>;
  validity: Record<string, string>;
  signing: Record<string, string>;
  additional_notes: string;
};

export type DocumentTemplateData = {
  company: Record<string, string>;
  client: Record<string, string>;
  customer?: Record<string, string>;
  vehicle: Record<string, string>;
  order: Record<string, string>;
  document: Record<string, string>;
  employee: Record<string, string>;
  deal?: Record<string, string>;
  vehicle_a?: Record<string, string>;
  vehicle_b?: Record<string, string>;
  payment?: Record<string, string>;
  registration?: Record<string, string>;
  service?: Record<string, string>;
  handover?: Record<string, string | Record<string, string>>;
  power_of_attorney?: PowerOfAttorneyTemplateSection;
  document_type?: string;
  power_of_attorney_form?: import("@/lib/types/power-of-attorney").PowerOfAttorneyFormInput;
  _generation_meta?: import("@/lib/documents/snapshot-metadata").GeneratedDocumentSnapshotMeta;
};

export type GenerateDocumentInput = {
  templateId: string;
  language: DocumentTemplateLanguage;
  clientId?: number | null;
  vehicleId?: number | null;
  documentTaskId?: number | null;
  dealId?: string | null;
  documentName?: string;
  overrides?: DocumentTemplateOverrides;
  snapshot?: DocumentTemplateData;
  editedSnapshot?: DocumentTemplateData;
  powerOfAttorney?: import("@/lib/types/power-of-attorney").PowerOfAttorneyFormInput;
};

export type TemplateValidationResult = {
  recognized: string[];
  unknown: string[];
};
