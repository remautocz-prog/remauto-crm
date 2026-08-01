import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientDetails } from "@/components/clients/client-details";
import { buildClientActivityTimeline, groupCarsByRelationship } from "@/lib/clients/activity";
import { calculateClientProfileFinance } from "@/lib/clients/profile-finance";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getClientNotes } from "@/lib/queries/client-notes";
import {
  getCarExpenseTotalsByCarIds,
  getCarsAvailableToLink,
  getClientById,
  getClientDetailingOrders,
  getClientFinanceTransactions,
  getClientRelatedCars,
} from "@/lib/queries/clients";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";
import { getClientDocumentSummary } from "@/lib/queries/documents";
import { getDocumentTemplates } from "@/lib/queries/document-templates";
import { getGeneratedDocuments } from "@/lib/queries/generated-documents";
import { getDealsByClientId } from "@/lib/queries/deals";
import { getCurrentUser } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { translateDocumentStatus } from "@/lib/i18n/documents";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ClientDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const clientId = Number(id);
  const t = await getTranslations("clients");

  if (Number.isNaN(clientId)) return { title: t("detailFallback") };

  try {
    const client = await getClientById(clientId);
    if (!client) return { title: t("detailFallback") };
    return { title: getClientDisplayName(client) };
  } catch {
    return { title: t("detailFallback") };
  }
}

async function getCarOptionsForDocuments() {
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

async function loadClientDetail(clientId: number) {
  const [
    client,
    cars,
    documentSummary,
    detailingOrders,
    notes,
    linkableCars,
    clients,
    documentCars,
    profiles,
    user,
    documentTemplates,
    generatedDocuments,
    clientDeals,
  ] = await Promise.all([
    getClientById(clientId),
    getClientRelatedCars(clientId),
    getClientDocumentSummary(clientId),
    getClientDetailingOrders(clientId),
    getClientNotes(clientId),
    getCarsAvailableToLink(clientId),
    getClientOptions(),
    getCarOptionsForDocuments(),
    getProfileOptions(),
    getCurrentUser(),
    getDocumentTemplates(),
    getGeneratedDocuments({ clientId }),
    getDealsByClientId(clientId),
  ]);

  if (!client) return null;

  const carIds = cars.map((car) => car.id);
  const [financeTransactions, carExpenseTotals] = await Promise.all([
    getClientFinanceTransactions(carIds),
    getCarExpenseTotalsByCarIds(carIds),
  ]);

  const carGroups = groupCarsByRelationship(cars, clientId);
  const profileFinance = calculateClientProfileFinance({
    cars,
    carExpenseTotals,
    documentTasks: documentSummary.all,
    activeDocumentOrders: documentSummary.active.length,
  });

  return {
    client,
    cars,
    carGroups,
    documentSummary,
    detailingOrders,
    financeTransactions,
    carExpenseTotals,
    profileFinance,
    notes,
    linkableCars,
    documentFormOptions: {
      clients,
      cars: documentCars,
      profiles,
    },
    currentUserId: user?.id ?? null,
    documentTemplates,
    generatedDocuments,
    deals: clientDeals,
  };
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) notFound();

  let data;
  try {
    data = await loadClientDetail(clientId);
  } catch {
    notFound();
  }

  if (!data) notFound();

  const tActivity = await getTranslations("clients.activity");
  const tDocuments = await getTranslations("documents");
  const tStatus = await getTranslations("documents.status");
  const tClients = await getTranslations("clients");

  const activityItems = buildClientActivityTimeline({
    client: data.client,
    cars: data.cars,
    documentTasks: data.documentSummary.all,
    detailingOrders: data.detailingOrders,
    financeTransactions: data.financeTransactions,
    notes: data.notes,
    labels: {
      clientCreated: tActivity("clientCreated"),
      clientUpdated: tClients("clientUpdated"),
      clientArchived: tClients("archiveClient"),
      clientUnarchived: tClients("unarchiveClient"),
      carAdded: (brand, model) => tActivity("carAdded", { brand, model }),
      carSold: (brand, model) => tActivity("carSold", { brand, model }),
      documentCreated: (title) => tActivity("documentCreated", { title }),
      documentCompleted: (title) => tActivity("documentCompleted", { title }),
      documentStatusChanged: (title, status) =>
        tActivity("documentStatusChanged", { title, status }),
      documentPaymentMarked: (title, amount) =>
        tActivity("documentPaymentMarked", { title, amount }),
      detailingCreated: (id: string) => tActivity("detailingCreated", { id }),
      detailingCompleted: (id: string) => tActivity("detailingCompleted", { id }),
      paymentRegistered: (amount) => tActivity("paymentRegistered", { amount }),
      noteAdded: tClients("noteAdded"),
      documentFallback: (id) => tDocuments("taskFallback", { id }),
    },
    formatCurrency: (value) =>
      new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
      }).format(value),
    translateStatus: (status) => translateDocumentStatus(tStatus, status),
  });

  return (
    <ClientDetails
      client={data.client}
      cars={data.cars}
      carExpenseTotals={data.carExpenseTotals}
      linkableCars={data.linkableCars}
      documentTasks={data.documentSummary.all}
      profileFinance={data.profileFinance}
      notes={data.notes}
      activityItems={activityItems}
      currentUserId={data.currentUserId}
      documentFormOptions={data.documentFormOptions}
      documentTemplates={data.documentTemplates}
      generatedDocuments={data.generatedDocuments}
      deals={data.deals}
    />
  );
}
