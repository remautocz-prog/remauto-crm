import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DocumentTaskDetails } from "@/components/documents/document-task-details";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";
import { getDocumentTaskById } from "@/lib/queries/documents";
import { getDocumentTemplates } from "@/lib/queries/document-templates";
import { getGeneratedDocuments } from "@/lib/queries/generated-documents";
import { createClient } from "@/lib/supabase/server";

type DocumentDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function getCarOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("id, brand, model, year, vin, registration_number, client_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: number;
    brand: string;
    model: string;
    year: number;
    vin: string | null;
    registration_number: string | null;
    client_id: number | null;
  }>;
}

export async function generateMetadata({
  params,
}: DocumentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const taskId = Number(id);
  const t = await getTranslations("documents");

  if (Number.isNaN(taskId)) return { title: t("detailFallback") };

  try {
    const task = await getDocumentTaskById(taskId);
    if (!task) return { title: t("detailFallback") };
    return { title: `#${task.id}` };
  } catch {
    return { title: t("detailFallback") };
  }
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  const taskId = Number(id);
  if (Number.isNaN(taskId)) notFound();

  let task;
  try {
    task = await getDocumentTaskById(taskId);
  } catch {
    notFound();
  }
  if (!task) notFound();

  const [clients, cars, profiles, documentTemplates, generatedDocuments] = await Promise.all([
    getClientOptions(),
    getCarOptions(),
    getProfileOptions(),
    getDocumentTemplates(),
    getGeneratedDocuments({ documentTaskId: taskId }),
  ]);

  return (
    <DocumentTaskDetails
      task={task}
      clients={clients}
      cars={cars}
      profiles={profiles}
      documentTemplates={documentTemplates}
      generatedDocuments={generatedDocuments}
    />
  );
}
