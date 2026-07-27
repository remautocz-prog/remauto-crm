import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientDetails } from "@/components/clients/client-details";
import { buildClientActivityTimeline, groupCarsByRelationship } from "@/lib/clients/activity";
import { calculateClientFinanceSummary } from "@/lib/clients/revenue";
import { getClientDisplayName } from "@/lib/clients/validation";
import {
  getClientById,
  getClientDetailingOrders,
  getClientFinanceTransactions,
  getClientRelatedCars,
  getClientRelatedCounts,
} from "@/lib/queries/clients";
import { getClientDocumentSummary } from "@/lib/queries/documents";

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

async function loadClientDetail(clientId: number) {
  const [client, cars, documentSummary, detailingOrders, relatedCounts] = await Promise.all([
    getClientById(clientId),
    getClientRelatedCars(clientId),
    getClientDocumentSummary(clientId),
    getClientDetailingOrders(clientId),
    getClientRelatedCounts(clientId),
  ]);

  if (!client) return null;

  const carIds = cars.map((car) => car.id);
  const financeTransactions = await getClientFinanceTransactions(carIds);
  const financeSummary = calculateClientFinanceSummary(cars, financeTransactions);
  const carGroups = groupCarsByRelationship(cars, clientId);

  return {
    client,
    cars,
    carGroups,
    documentSummary,
    detailingOrders,
    financeTransactions,
    financeSummary,
    relatedCounts,
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

  const activityItems = buildClientActivityTimeline({
    client: data.client,
    cars: data.cars,
    documentTasks: data.documentSummary.all,
    detailingOrders: data.detailingOrders,
    financeTransactions: data.financeTransactions,
    labels: {
      clientCreated: tActivity("clientCreated"),
      carAdded: (brand, model) => tActivity("carAdded", { brand, model }),
      carSold: (brand, model) => tActivity("carSold", { brand, model }),
      documentCreated: (title) => tActivity("documentCreated", { title }),
      documentCompleted: (title) => tActivity("documentCompleted", { title }),
      detailingCreated: (id) => tActivity("detailingCreated", { id }),
      detailingCompleted: (id) => tActivity("detailingCompleted", { id }),
      paymentRegistered: (amount) => tActivity("paymentRegistered", { amount }),
      documentFallback: (id) => tDocuments("taskFallback", { id }),
    },
    formatCurrency: (value) =>
      new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
      }).format(value),
  });

  return (
    <ClientDetails
      client={data.client}
      cars={data.cars}
      carGroups={data.carGroups}
      documentSummary={data.documentSummary}
      detailingOrders={data.detailingOrders}
      financeTransactions={data.financeTransactions}
      financeSummary={data.financeSummary}
      relatedCounts={data.relatedCounts}
      activityItems={activityItems}
    />
  );
}
