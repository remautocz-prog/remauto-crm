"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileDown, RefreshCw, Copy } from "lucide-react";
import {
  archiveGeneratedDocumentAction,
  getGeneratedDocumentDownloadUrlAction,
  getGeneratedDocumentSnapshotAction,
} from "@/lib/actions/document-generation";
import type { DocumentTemplate } from "@/lib/types/document-templates";
import type { GeneratedDocument } from "@/lib/types/document-templates";
import { PDF_GENERATION_ENABLED } from "@/lib/constants/document-templates";
import { getPowerOfAttorneyListSummary, isPowerOfAttorneySnapshot } from "@/lib/documents/power-of-attorney";
import { GenerateDocumentDialog } from "@/components/document-generator/generate-document-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type GeneratedDocumentsPanelProps = {
  documents: GeneratedDocument[];
  templates: DocumentTemplate[];
  clientId?: number | null;
  vehicleId?: number | null;
  documentTaskId?: number | null;
  dealId?: string | null;
  dealType?: string | null;
};

export function GeneratedDocumentsPanel({
  documents,
  templates,
  clientId,
  vehicleId,
  documentTaskId,
  dealId,
  dealType,
}: GeneratedDocumentsPanelProps) {
  const t = useTranslations("documentGenerator");
  const tPoa = useTranslations("documentGenerator.powerOfAttorney");
  const tCat = useTranslations("documentGenerator.categories");
  const { formatDateTime } = useFormatters();
  const router = useRouter();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [dialogState, setDialogState] = useState<{
    snapshot: import("@/lib/types/document-templates").DocumentTemplateData | null;
    templateId: string | null;
    language: import("@/lib/constants/document-templates").DocumentTemplateLanguage;
  }>({ snapshot: null, templateId: null, language: "cs" });
  const [isPending, startTransition] = useTransition();

  function handleDownload(id: string, format: "docx" | "pdf" = "docx") {
    startTransition(async () => {
      const result = await getGeneratedDocumentDownloadUrlAction(id, format);
      if (result.success && result.data?.downloadUrl) {
        window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  function openGenerate(options?: {
    snapshot?: import("@/lib/types/document-templates").DocumentTemplateData | null;
    templateId?: string | null;
    language?: import("@/lib/constants/document-templates").DocumentTemplateLanguage;
  }) {
    setDialogState({
      snapshot: options?.snapshot ?? null,
      templateId: options?.templateId ?? null,
      language: options?.language ?? "cs",
    });
    setGenerateOpen(true);
  }

  function handleDuplicate(doc: GeneratedDocument) {
    startTransition(async () => {
      const result = await getGeneratedDocumentSnapshotAction(doc.id);
      if (result.success && result.data) {
        openGenerate({
          snapshot: result.data.snapshot,
          templateId: doc.template_id,
          language: doc.language,
        });
      }
    });
  }

  function handleRegenerate(doc: GeneratedDocument) {
    const poaForm = isPowerOfAttorneySnapshot(doc.snapshot_data)
      ? (doc.snapshot_data as import("@/lib/types/document-templates").DocumentTemplateData)
      : null;

    openGenerate({
      snapshot: poaForm,
      templateId: doc.template_id,
      language: doc.language,
    });
  }

  return (
    <>
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base text-white">{t("generatedDocuments")}</CardTitle>
          <Button size="sm" onClick={() => openGenerate()}>
            {t("generateDocument")}
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-zinc-400">{t("noGeneratedDocuments")}</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => {
                const poaSummary = isPowerOfAttorneySnapshot(doc.snapshot_data)
                  ? getPowerOfAttorneyListSummary(doc.snapshot_data)
                  : null;

                return (
                <li
                  key={doc.id}
                  className="rounded-lg border border-zinc-800/80 p-3 text-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{doc.document_name}</p>
                      <p className="text-xs text-zinc-500">
                        {doc.template?.name
                          ? `${doc.template.name} · ${tCat(doc.template.category)}`
                          : t("unknownTemplate")}
                      </p>
                      {poaSummary ? (
                        <p className="text-xs text-zinc-400">
                          {tPoa("principal")}: {poaSummary.principal || "—"}
                          {" · "}
                          {tPoa("authorizedPerson")}: {poaSummary.authorizedPerson || "—"}
                          {" · "}
                          {poaSummary.vehicle || "—"}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        {doc.language.toUpperCase()} · {formatDateTime(doc.created_at)}
                        {doc.generator?.full_name ? ` · ${doc.generator.full_name}` : ""}
                        {doc.deal_id ? ` · ${t("linkedDeal")}` : ""}
                        {doc.client_id ? ` · ${t("linkedClient")}` : ""}
                        {doc.vehicle_id ? ` · ${t("linkedVehicle")}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || !doc.docx_storage_path}
                        onClick={() => handleDownload(doc.id, "docx")}
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        {t("downloadDocx")}
                      </Button>
                      {PDF_GENERATION_ENABLED && doc.pdf_storage_path ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleDownload(doc.id, "pdf")}
                        >
                          {t("downloadPdf")}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleDuplicate(doc)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("duplicateFromSnapshot")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleRegenerate(doc)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t("regenerateDocument")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await archiveGeneratedDocumentAction(doc.id, !doc.archived_at);
                            router.refresh();
                          })
                        }
                      >
                        {doc.archived_at ? t("restoreGenerated") : t("archiveGenerated")}
                      </Button>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <GenerateDocumentDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        templates={templates}
        initialClientId={clientId}
        initialVehicleId={vehicleId}
        initialDocumentTaskId={documentTaskId}
        initialDealId={dealId}
        initialDealType={dealType}
        initialSnapshot={dialogState.snapshot}
        initialTemplateId={dialogState.templateId}
        initialLanguage={dialogState.language}
      />
    </>
  );
}
