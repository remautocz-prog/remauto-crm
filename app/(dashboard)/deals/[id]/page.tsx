import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DealDetails } from "@/components/deals/deal-details";
import { getDocumentTemplates } from "@/lib/queries/document-templates";
import { getGeneratedDocuments } from "@/lib/queries/generated-documents";
import { getDealById } from "@/lib/queries/deals";

type DealDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: DealDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const deal = await getDealById(id);
  const t = await getTranslations("deals");
  return { title: deal?.deal_number ?? t("deal") };
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { id } = await params;
  const [deal, documentTemplates, generatedDocuments] = await Promise.all([
    getDealById(id),
    getDocumentTemplates(),
    getGeneratedDocuments({ dealId: id }),
  ]);

  if (!deal) notFound();

  return (
    <DealDetails
      deal={deal}
      documentTemplates={documentTemplates}
      generatedDocuments={generatedDocuments}
    />
  );
}
