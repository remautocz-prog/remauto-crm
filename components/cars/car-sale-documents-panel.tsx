"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import type { DocumentTemplate } from "@/lib/types/document-templates";
import { GenerateDocumentDialog } from "@/components/document-generator/generate-document-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SALE_TEMPLATE_CATEGORIES = ["purchase_agreement", "handover_protocol"] as const;

type CarSaleDocumentsPanelProps = {
  vehicleId: number;
  clientId?: number | null;
  templates: DocumentTemplate[];
};

export function CarSaleDocumentsPanel({
  vehicleId,
  clientId,
  templates,
}: CarSaleDocumentsPanelProps) {
  const t = useTranslations("cars");
  const tCat = useTranslations("documentGenerator.categories");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const saleTemplates = templates.filter((template) =>
    SALE_TEMPLATE_CATEGORIES.includes(
      template.category as (typeof SALE_TEMPLATE_CATEGORIES)[number]
    )
  );

  if (saleTemplates.length === 0) return null;

  function openTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setDialogOpen(true);
  }

  return (
    <>
      <Card id="sale-documents" className="border-emerald-900/40 bg-emerald-950/10 scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileText className="h-4 w-4 text-emerald-400" />
            {t("prepareSaleDocuments")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {saleTemplates.map((template) => (
            <Button
              key={template.id}
              variant="secondary"
              size="sm"
              onClick={() => openTemplate(template.id)}
            >
              {tCat(template.category as never)}
            </Button>
          ))}
        </CardContent>
      </Card>

      <GenerateDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templates={templates}
        initialVehicleId={vehicleId}
        initialClientId={clientId}
        initialTemplateId={selectedTemplateId}
      />
    </>
  );
}
