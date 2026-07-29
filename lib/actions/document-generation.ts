"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { PDF_GENERATION_ENABLED } from "@/lib/constants/document-templates";
import type { DocumentTemplateLanguage } from "@/lib/constants/document-templates";
import {
  buildDocumentTemplateData,
  renderDocxTemplate,
  sanitizeDocumentFilename,
} from "@/lib/documents/template-engine";
import { getSampleTemplateData } from "@/lib/documents/template-placeholders";
import { getCarById, getProfileById } from "@/lib/queries/cars";
import { getClientById } from "@/lib/queries/clients";
import { getDocumentTaskById } from "@/lib/queries/documents";
import {
  getCompanySettings,
  getDocumentTemplateById,
} from "@/lib/queries/document-templates";
import { buildDealDocumentTemplateData } from "@/lib/deals/template-data";
import { getDealById, getDeals } from "@/lib/queries/deals";
import { getGeneratedDocumentById } from "@/lib/queries/generated-documents";
import {
  applyTemplateOverrides,
  buildOverridesFromEditedSnapshot,
  collectOverridePaths,
  emptyDocumentTemplateData,
  resolveFinalDocumentSnapshot,
} from "@/lib/documents/apply-template-overrides";
import {
  getCrmDocumentLoadStatus,
  hasCoreCrmDocumentData,
  logDocumentGenerationContext,
  requiresDealForTemplate,
} from "@/lib/documents/document-generation-validation";
import {
  buildNotarizedLabels,
  buildPowerOfAttorneyTemplateData,
  buildScopeLabels,
  buildValidityLabels,
  collectPowerOfAttorneyValidationIssues,
} from "@/lib/documents/power-of-attorney";
import { attachSnapshotMetadata } from "@/lib/documents/snapshot-metadata";
import { resolveDataSourceMode } from "@/lib/constants/document-template-data-source";
import {
  createSignedDownloadUrl,
  downloadTemplateFile,
  uploadGeneratedDocx,
} from "@/lib/storage/document-storage";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentTemplateData,
  DocumentTemplateOverrides,
  GenerateDocumentInput,
} from "@/lib/types/document-templates";
import type { AppLocale } from "@/i18n/config";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";
import { getTranslations } from "next-intl/server";

async function loadGenerationContext(input: {
  clientId?: number | null;
  vehicleId?: number | null;
  documentTaskId?: number | null;
  userId: string;
}) {
  const [company, client, vehicle, order, employee] = await Promise.all([
    getCompanySettings(),
    input.clientId ? getClientById(input.clientId) : Promise.resolve(null),
    input.vehicleId ? getCarById(input.vehicleId) : Promise.resolve(null),
    input.documentTaskId
      ? getDocumentTaskById(input.documentTaskId)
      : Promise.resolve(null),
    getProfileById(input.userId),
  ]);

  let resolvedVehicle = vehicle;
  let resolvedClient = client;

  if (order) {
    if (!resolvedClient && order.client_id) {
      resolvedClient = await getClientById(order.client_id);
    }
    if (!resolvedVehicle && order.car_id) {
      resolvedVehicle = await getCarById(order.car_id);
    }
  }

  if (!resolvedVehicle && resolvedClient && order?.car_id) {
    resolvedVehicle = await getCarById(order.car_id);
  }

  return {
    company,
    client: resolvedClient,
    vehicle: resolvedVehicle,
    order,
    employee,
  };
}

function requiresLinkedRecords(
  category: import("@/lib/constants/document-templates").DocumentTemplateCategory,
  mode: import("@/lib/constants/document-template-data-source").DataSourceMode,
  input: GenerateDocumentInput
) {
  if (input.powerOfAttorney || input.snapshot) return null;

  if (requiresDealForTemplate(category, mode) && !input.dealId) {
    return "selectDealBeforeGenerate";
  }

  if (mode === "manual_only") return null;
  if (input.editedSnapshot) return null;

  if (
    category === "purchase_agreement" ||
    category === "commission_agreement" ||
    category === "invoice_sheet"
  ) {
    if (
      !input.dealId &&
      !input.clientId &&
      !input.vehicleId &&
      !input.documentTaskId
    ) {
      return "linkedRecordRequired";
    }
  }

  return null;
}

async function loadDealTemplateData(dealId: string, locale: AppLocale) {
  const deal = await getDealById(dealId);
  if (!deal) {
    throw new Error("dealNotFound");
  }
  return {
    deal,
    data: buildDealDocumentTemplateData(deal, locale),
  };
}

async function buildSnapshotForGeneration(
  input: GenerateDocumentInput,
  userId: string,
  locale: AppLocale
): Promise<DocumentTemplateData> {
  if (input.powerOfAttorney) {
    const t = await getTranslations({
      locale: input.language,
      namespace: "documentGenerator.powerOfAttorney",
    });
    const issues = collectPowerOfAttorneyValidationIssues(input.powerOfAttorney);
    if (issues.length > 0) {
      throw new Error(t(issues[0].messageKey as never));
    }
    return buildPowerOfAttorneyTemplateData(
      input.powerOfAttorney,
      buildScopeLabels((key) => t(key as never)),
      buildValidityLabels((key) => t(key as never)),
      buildNotarizedLabels((key) => t(key as never))
    );
  }

  if (input.editedSnapshot) {
    return input.editedSnapshot;
  }

  if (input.snapshot) {
    return input.snapshot;
  }

  if (input.dealId) {
    const { data } = await loadDealTemplateData(input.dealId, locale);
    return applyTemplateOverrides(data, input.overrides);
  }

  const context = await loadGenerationContext({
    clientId: input.clientId,
    vehicleId: input.vehicleId,
    documentTaskId: input.documentTaskId,
    userId,
  });

  return buildDocumentTemplateData({
    locale,
    company: context.company,
    client: context.client as never,
    vehicle: context.vehicle,
    order: context.order,
    employee: context.employee,
    overrides: input.overrides,
    generatedCity: input.overrides?.document?.generated_city,
    signingDate: input.overrides?.document?.signing_date,
    additionalNotes: input.overrides?.document?.additional_notes,
  });
}

export async function buildGenerationPreviewAction(input: {
  language: DocumentTemplateLanguage;
  clientId?: number | null;
  vehicleId?: number | null;
  documentTaskId?: number | null;
  dealId?: string | null;
  overrides?: DocumentTemplateOverrides;
}): Promise<ActionResult<{ data: DocumentTemplateData }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (input.dealId) {
    try {
      const { data } = await loadDealTemplateData(
        input.dealId,
        input.language as AppLocale
      );
      const merged = applyTemplateOverrides(data, input.overrides);
      return { success: true, data: { data: merged } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error && error.message === "dealNotFound"
            ? "Deal not found"
            : error instanceof Error
              ? error.message
              : "Preview failed",
      };
    }
  }

  const context = await loadGenerationContext({
    clientId: input.clientId,
    vehicleId: input.vehicleId,
    documentTaskId: input.documentTaskId,
    userId: user.id,
  });

  const data = buildDocumentTemplateData({
    locale: input.language as AppLocale,
    company: context.company,
    client: context.client as never,
    vehicle: context.vehicle,
    order: context.order,
    employee: context.employee,
    overrides: input.overrides,
    generatedCity: input.overrides?.document?.generated_city,
    signingDate: input.overrides?.document?.signing_date,
    additionalNotes: input.overrides?.document?.additional_notes,
  });

  return { success: true, data: { data } };
}

export async function testDocumentTemplateAction(
  templateId: string
): Promise<ActionResult<{ downloadUrl: string }>> {
  const template = await getDocumentTemplateById(templateId);
  if (!template || !template.is_active) {
    return { success: false, error: "Template not found" };
  }

  try {
    const buffer = await downloadTemplateFile(template.storage_path);
    const rendered = renderDocxTemplate(buffer, getSampleTemplateData());
    const generatedId = randomUUID();
    const storagePath = await uploadGeneratedDocx({
      generatedId,
      clientId: null,
      filename: `test-${sanitizeDocumentFilename(template.name)}`,
      buffer: rendered,
    });

    const downloadUrl = await createSignedDownloadUrl("generated", storagePath, 120);
    return { success: true, data: { downloadUrl } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Template test failed",
    };
  }
}

export async function generateDocumentAction(
  input: GenerateDocumentInput
): Promise<ActionResult<{ id: string; downloadUrl: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const template = await getDocumentTemplateById(input.templateId);
  if (!template || !template.is_active) {
    return { success: false, error: "Template not found or archived" };
  }

  const dataSourceMode = resolveDataSourceMode(
    template.category,
    template.data_source_mode
  );
  const linkErrorKey = requiresLinkedRecords(
    template.category,
    dataSourceMode,
    input
  );
  if (linkErrorKey) {
    const t = await getTranslations("documentGenerator");
    return {
      success: false,
      error: t(linkErrorKey as never),
    };
  }

  let baseSnapshot: DocumentTemplateData;
  let editedSnapshot = input.editedSnapshot;
  let dealLoaded = Boolean(input.dealId);

  try {
    baseSnapshot = await buildSnapshotForGeneration(
      { ...input, editedSnapshot: undefined, snapshot: undefined },
      user.id,
      input.language as AppLocale
    );
  } catch (error) {
    const t = await getTranslations("documentGenerator");
    const message =
      error instanceof Error && error.message === "dealNotFound"
        ? t("dealNotFound")
        : error instanceof Error
          ? error.message
          : t("previewFailed");
    return { success: false, error: message };
  }

  if (
    !input.powerOfAttorney &&
    dataSourceMode === "manual_only" &&
    !input.dealId &&
    !input.clientId &&
    !input.vehicleId &&
    !input.documentTaskId
  ) {
    baseSnapshot = emptyDocumentTemplateData();
    if (!editedSnapshot) {
      editedSnapshot = emptyDocumentTemplateData();
    }
    dealLoaded = false;
  }

  const finalSnapshot = resolveFinalDocumentSnapshot(baseSnapshot, editedSnapshot);
  const manualOverrides = editedSnapshot
    ? buildOverridesFromEditedSnapshot(baseSnapshot, editedSnapshot)
    : input.overrides ?? {};

  if (
    requiresDealForTemplate(template.category, dataSourceMode) &&
    !hasCoreCrmDocumentData(finalSnapshot)
  ) {
    const t = await getTranslations("documentGenerator");
    return { success: false, error: t("dealDataNotLoaded") };
  }

  const loadStatus = getCrmDocumentLoadStatus(finalSnapshot, dealLoaded);
  logDocumentGenerationContext({
    templateId: template.id,
    dealId: input.dealId ?? null,
    templateCategory: template.category,
    dataSourceMode,
    loadStatus,
  });

  const overriddenPaths =
    editedSnapshot && baseSnapshot
      ? collectOverridePaths(baseSnapshot, editedSnapshot)
      : [];

  const snapshotData = attachSnapshotMetadata(finalSnapshot, {
    template_id: template.id,
    template_category: template.category,
    template_data_source_mode: dataSourceMode,
    linked_client_id: input.clientId ?? null,
    linked_vehicle_id: input.vehicleId ?? null,
    linked_deal_id: input.dealId ?? null,
    linked_document_task_id: input.documentTaskId ?? null,
    manual_overrides: manualOverrides,
    overridden_field_paths: overriddenPaths,
    generated_at: new Date().toISOString(),
    generated_by: user.id,
  });

  const generatedId = randomUUID();
  const documentName =
    input.documentName?.trim() ||
    `${template.name}-${new Date().toISOString().slice(0, 10)}`;

  try {
    const templateBuffer = await downloadTemplateFile(template.storage_path);
    const rendered = renderDocxTemplate(templateBuffer, snapshotData);
    const docxPath = await uploadGeneratedDocx({
      generatedId,
      clientId: input.clientId ?? null,
      filename: sanitizeDocumentFilename(documentName),
      buffer: rendered,
    });

    const { error } = await supabase.from("generated_documents").insert({
      id: generatedId,
      template_id: template.id,
      client_id: input.clientId ?? null,
      vehicle_id: input.vehicleId ?? null,
      document_task_id: input.documentTaskId ?? null,
      deal_id: input.dealId ?? null,
      generated_by: user.id,
      language: input.language,
      document_name: documentName,
      docx_storage_path: docxPath,
      pdf_storage_path: PDF_GENERATION_ENABLED ? null : null,
      snapshot_data: snapshotData,
    });

    if (error) throw error;

    const downloadUrl = await createSignedDownloadUrl("generated", docxPath, 300);

    revalidatePath("/settings/templates");
    if (input.clientId) revalidatePath(`/clients/${input.clientId}`);
    if (input.vehicleId) revalidatePath(`/cars/${input.vehicleId}`);
    if (input.documentTaskId) {
      revalidatePath(`/documents/${input.documentTaskId}`);
    }
    if (input.dealId) revalidatePath(`/deals/${input.dealId}`);

    return { success: true, data: { id: generatedId, downloadUrl } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Document generation failed",
    };
  }
}

export async function listDealsForDocumentGenerationAction(): Promise<
  ActionResult<{
    deals: Array<{
      id: string;
      deal_number: string;
      label: string;
    }>;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const deals = await getDeals({ archived: false });
    return {
      success: true,
      data: {
        deals: deals.slice(0, 100).map((deal) => {
          const client =
            deal.client_snapshot.company_name ||
            deal.client_snapshot.full_name ||
            deal.client?.company ||
            deal.client?.full_name ||
            "—";
          const vehicleA =
            deal.vehicle_a_snapshot.full_name ||
            `${deal.vehicle_a_snapshot.make} ${deal.vehicle_a_snapshot.model}`.trim() ||
            "—";
          const vehicleB =
            deal.vehicle_b_snapshot.full_name ||
            `${deal.vehicle_b_snapshot.make} ${deal.vehicle_b_snapshot.model}`.trim() ||
            "—";
          return {
            id: deal.id,
            deal_number: deal.deal_number,
            label: `${deal.deal_number} · ${client} · ${vehicleA} / ${vehicleB}`,
          };
        }),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load deals",
    };
  }
}

export async function getGeneratedDocumentDownloadUrlAction(
  generatedId: string,
  format: "docx" | "pdf" = "docx"
): Promise<ActionResult<{ downloadUrl: string }>> {
  const record = await getGeneratedDocumentById(generatedId);
  if (!record || record.archived_at) {
    return { success: false, error: "Generated document not found" };
  }

  const path =
    format === "pdf" ? record.pdf_storage_path : record.docx_storage_path;

  if (!path) {
    return { success: false, error: format === "pdf" ? "PDF not available" : "File missing" };
  }

  try {
    const downloadUrl = await createSignedDownloadUrl("generated", path, 300);
    return { success: true, data: { downloadUrl } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

export async function archiveGeneratedDocumentAction(
  generatedId: string,
  archived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("generated_documents")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", generatedId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/settings/templates");
  return { success: true };
}

export async function getGeneratedDocumentSnapshotAction(
  generatedId: string
): Promise<ActionResult<{ snapshot: DocumentTemplateData; meta: GenerateDocumentInput }>> {
  const record = await getGeneratedDocumentById(generatedId);
  if (!record) {
    return { success: false, error: "Generated document not found" };
  }

  return {
    success: true,
    data: {
      snapshot: record.snapshot_data as DocumentTemplateData,
      meta: {
        templateId: record.template_id ?? "",
        language: record.language,
        clientId: record.client_id,
        vehicleId: record.vehicle_id,
        documentTaskId: record.document_task_id,
        dealId: record.deal_id,
        documentName: record.document_name,
        snapshot: record.snapshot_data as DocumentTemplateData,
      },
    },
  };
}
