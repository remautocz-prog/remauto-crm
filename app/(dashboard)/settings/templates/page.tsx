import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { CompanySettingsForm } from "@/components/document-templates/company-settings-form";
import { PlaceholdersPanel } from "@/components/document-templates/placeholders-panel";
import { TemplatesManager } from "@/components/document-templates/templates-manager";
import { GeneratedDocumentsPanel } from "@/components/document-generator/generated-documents-panel";
import { PageHeader } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import {
  getCompanySettings,
  getDocumentTemplates,
} from "@/lib/queries/document-templates";
import { getGeneratedDocuments } from "@/lib/queries/generated-documents";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("documentGenerator");
  return { title: t("documentTemplates") };
}

export default async function DocumentTemplatesPage() {
  const [templates, companySettings, generatedDocuments, t, tActions] = await Promise.all([
    getDocumentTemplates({ includeArchived: true }),
    getCompanySettings(),
    getGeneratedDocuments({ limit: 50 }),
    getTranslations("documentGenerator"),
    getTranslations("actions"),
  ]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
        <Link href="/settings">
          <ArrowLeft className="h-4 w-4" />
          {tActions("backToList")}
        </Link>
      </Button>
      <PageHeader
        title={t("documentTemplates")}
        description={t("templatesPageDescription")}
      />
      <CompanySettingsForm settings={companySettings} />
      <TemplatesManager templates={templates} />
      <GeneratedDocumentsPanel
        documents={generatedDocuments}
        templates={templates}
      />
      <PlaceholdersPanel />
    </div>
  );
}
