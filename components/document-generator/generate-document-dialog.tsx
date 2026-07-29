"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  buildGenerationPreviewAction,
  generateDocumentAction,
} from "@/lib/actions/document-generation";
import { PDF_GENERATION_ENABLED } from "@/lib/constants/document-templates";
import type { DocumentTemplateLanguage } from "@/lib/constants/document-templates";
import { resolveDataSourceMode } from "@/lib/constants/document-template-data-source";
import { requiresDealForTemplate } from "@/lib/documents/document-generation-validation";
import {
  cloneDocumentTemplateData,
  emptyDocumentTemplateData,
} from "@/lib/documents/apply-template-overrides";
import { extractPowerOfAttorneyFormFromSnapshot } from "@/lib/documents/power-of-attorney";
import {
  pickDefaultTemplateId,
  sortTemplatesForGeneration,
} from "@/lib/documents/template-sorting";
import type {
  DocumentTemplate,
  DocumentTemplateData,
} from "@/lib/types/document-templates";
import { CrmDocumentGenerationForm } from "@/components/document-generator/crm-document-generation-form";
import { DealSelectForGeneration } from "@/components/document-generator/deal-select-for-generation";
import { PowerOfAttorneyForm } from "@/components/document-generator/power-of-attorney-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GenerateDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: DocumentTemplate[];
  initialClientId?: number | null;
  initialVehicleId?: number | null;
  initialDocumentTaskId?: number | null;
  initialDealId?: string | null;
  initialDealType?: string | null;
  initialSnapshot?: DocumentTemplateData | null;
  initialTemplateId?: string | null;
  initialLanguage?: DocumentTemplateLanguage;
};

type GenerateDocumentDialogFormProps = Omit<
  GenerateDocumentDialogProps,
  "open" | "onOpenChange"
> & {
  onClose: () => void;
};

function GenerateDocumentDialogForm({
  templates,
  initialClientId,
  initialVehicleId,
  initialDocumentTaskId,
  initialDealId,
  initialDealType,
  initialSnapshot,
  initialTemplateId,
  initialLanguage = "cs",
  onClose,
}: GenerateDocumentDialogFormProps) {
  const t = useTranslations("documentGenerator");
  const tCat = useTranslations("documentGenerator.categories");
  const tMode = useTranslations("documentGenerator.dataSourceMode");
  const router = useRouter();

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates]
  );

  const { suggested, other } = useMemo(
    () =>
      sortTemplatesForGeneration(activeTemplates, {
        dealType: initialDealType,
      }),
    [activeTemplates, initialDealType]
  );

  const initialPoaForm = initialSnapshot
    ? extractPowerOfAttorneyFormFromSnapshot(initialSnapshot)
    : null;
  const hasInitialCrmSnapshot =
    Boolean(initialSnapshot) && !initialPoaForm;

  const [templateId, setTemplateId] = useState(() =>
    pickDefaultTemplateId(activeTemplates, {
      dealType: initialDealType,
      preferredTemplateId: initialTemplateId,
    })
  );
  const [selectedDealId, setSelectedDealId] = useState(initialDealId ?? "");
  const [language, setLanguage] =
    useState<DocumentTemplateLanguage>(initialLanguage);
  const [baseData, setBaseData] = useState<DocumentTemplateData | null>(() =>
    hasInitialCrmSnapshot && initialSnapshot
      ? cloneDocumentTemplateData(initialSnapshot)
      : null
  );
  const [formData, setFormData] = useState<DocumentTemplateData>(() =>
    hasInitialCrmSnapshot && initialSnapshot
      ? cloneDocumentTemplateData(initialSnapshot)
      : emptyDocumentTemplateData()
  );
  const [documentName, setDocumentName] = useState("");
  const poaInitialForm = initialPoaForm;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPreviewPending, startPreviewTransition] = useTransition();

  const selectedTemplate = activeTemplates.find((item) => item.id === templateId);
  const isPowerOfAttorney = selectedTemplate?.category === "power_of_attorney";
  const dataSourceMode = selectedTemplate
    ? resolveDataSourceMode(
        selectedTemplate.category,
        selectedTemplate.data_source_mode
      )
    : "crm_with_manual_overrides";
  const requiresDeal = selectedTemplate
    ? requiresDealForTemplate(selectedTemplate.category, dataSourceMode)
    : false;
  const activeDealId = selectedDealId || initialDealId || null;

  function clearPreviewData() {
    setBaseData(null);
    setFormData(emptyDocumentTemplateData());
  }

  function handleDealChange(dealId: string) {
    setSelectedDealId(dealId);
    if (!dealId) {
      clearPreviewData();
    }
  }

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const nextTemplate = activeTemplates.find((item) => item.id === nextTemplateId);
    if (!nextTemplate) return;

    const nextMode = resolveDataSourceMode(
      nextTemplate.category,
      nextTemplate.data_source_mode
    );
    const nextRequiresDeal = requiresDealForTemplate(
      nextTemplate.category,
      nextMode
    );
    const dealId = selectedDealId || initialDealId || null;

    if (nextRequiresDeal && !dealId) {
      clearPreviewData();
    }
  }

  useEffect(() => {
    if (initialSnapshot || isPowerOfAttorney || !templateId) return;

    if (requiresDeal && !activeDealId) return;

    if (
      !requiresDeal &&
      dataSourceMode !== "manual_only" &&
      !initialClientId &&
      !initialVehicleId &&
      !initialDocumentTaskId &&
      !activeDealId
    ) {
      return;
    }

    startPreviewTransition(async () => {
      const result = await buildGenerationPreviewAction({
        language,
        clientId: initialClientId,
        vehicleId: initialVehicleId,
        documentTaskId: initialDocumentTaskId,
        dealId: activeDealId,
      });
      if (result.success && result.data) {
        const data = result.data.data;
        setBaseData(cloneDocumentTemplateData(data));
        setFormData(cloneDocumentTemplateData(data));
      } else if (dataSourceMode === "manual_only") {
        const empty = emptyDocumentTemplateData();
        setBaseData(empty);
        setFormData(cloneDocumentTemplateData(empty));
      }
    });
  }, [
    language,
    initialClientId,
    initialVehicleId,
    initialDocumentTaskId,
    activeDealId,
    initialSnapshot,
    templateId,
    isPowerOfAttorney,
    dataSourceMode,
    requiresDeal,
  ]);

  const canGenerateCrmDocument =
    !requiresDeal || (Boolean(activeDealId) && !isPreviewPending && Boolean(baseData));

  function handleGenerate() {
    if (!templateId) {
      setError(t("selectTemplate"));
      return;
    }

    if (requiresDeal && !activeDealId) {
      setError(t("selectDealBeforeGenerate"));
      return;
    }

    if (requiresDeal && !baseData) {
      setError(t("dealDataNotLoaded"));
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await generateDocumentAction({
        templateId,
        language,
        clientId: initialClientId,
        vehicleId: initialVehicleId,
        documentTaskId: initialDocumentTaskId,
        dealId: activeDealId,
        documentName: documentName || undefined,
        editedSnapshot: isPowerOfAttorney ? undefined : formData,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data?.downloadUrl) {
        window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("generateDocument")}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {activeTemplates.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("noTemplatesAvailable")}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("selectTemplate")}</Label>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suggested.length > 0 ? (
                      <>
                        <SelectItem value="__suggested_header__" disabled>
                          {t("suggestedTemplates")}
                        </SelectItem>
                        {suggested.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({tCat(template.category)})
                          </SelectItem>
                        ))}
                      </>
                    ) : null}
                    {other.length > 0 ? (
                      <>
                        {suggested.length > 0 ? (
                          <SelectItem value="__other_header__" disabled>
                            {t("otherTemplates")}
                          </SelectItem>
                        ) : null}
                        {other.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({tCat(template.category)})
                          </SelectItem>
                        ))}
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("documentLanguage")}</Label>
                <Select
                  value={language}
                  onValueChange={(value) =>
                    setLanguage(value as DocumentTemplateLanguage)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">RU</SelectItem>
                    <SelectItem value="cs">CS</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTemplate && requiresDeal && !initialDealId ? (
              <DealSelectForGeneration
                value={selectedDealId}
                onChange={handleDealChange}
                disabled={isPending}
              />
            ) : null}

            {selectedTemplate ? (
              <p className="text-xs text-zinc-500">
                {tMode("dataSourceMode")}: {tMode(dataSourceMode)}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>{t("templateName")}</Label>
              <Input
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                placeholder={selectedTemplate?.name ?? t("templateName")}
              />
            </div>

            {isPowerOfAttorney && templateId ? (
              <PowerOfAttorneyForm
                key={`${templateId}-${initialSnapshot ? "snapshot" : "new"}`}
                templateId={templateId}
                language={language}
                documentName={documentName}
                initialForm={poaInitialForm}
                contextClientId={initialClientId}
                contextVehicleId={initialVehicleId}
                contextDealId={initialDealId}
                onGenerated={() => {
                  router.refresh();
                  onClose();
                }}
                onError={setError}
              />
            ) : selectedTemplate ? (
              <>
                <CrmDocumentGenerationForm
                  category={selectedTemplate.category}
                  dataSourceMode={dataSourceMode}
                  baseData={baseData}
                  value={formData}
                  onChange={setFormData}
                  isLoading={isPreviewPending}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={isPending || !templateId || !canGenerateCrmDocument}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {t("generateDocx")}
                  </Button>
                  <Button type="button" variant="outline" disabled>
                    {PDF_GENERATION_ENABLED ? t("generatePdf") : t("pdfNotAvailable")}
                  </Button>
                </div>
              </>
            ) : null}

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </>
        )}
      </div>
    </>
  );
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  templates,
  initialClientId,
  initialVehicleId,
  initialDocumentTaskId,
  initialDealId,
  initialDealType,
  initialSnapshot,
  initialTemplateId,
  initialLanguage = "cs",
}: GenerateDocumentDialogProps) {
  const formKey = open
    ? [
        initialDealId ?? "",
        initialTemplateId ?? "",
        initialLanguage,
        initialClientId ?? "",
        initialVehicleId ?? "",
        initialDocumentTaskId ?? "",
      ].join(":")
    : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {open ? (
          <GenerateDocumentDialogForm
            key={formKey}
            templates={templates}
            initialClientId={initialClientId}
            initialVehicleId={initialVehicleId}
            initialDocumentTaskId={initialDocumentTaskId}
            initialDealId={initialDealId}
            initialDealType={initialDealType}
            initialSnapshot={initialSnapshot}
            initialTemplateId={initialTemplateId}
            initialLanguage={initialLanguage}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
