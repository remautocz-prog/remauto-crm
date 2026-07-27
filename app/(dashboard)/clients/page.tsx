import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientsList } from "@/components/clients/clients-list";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getClientFilterOptions, getClients } from "@/lib/queries/clients";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("clients") };
}

type ClientsPageProps = {
  searchParams: Promise<{
    q?: string;
    client_type?: string;
    country?: string;
    preferred_language?: string;
    sort?: string;
    show_archived?: string;
  }>;
};

async function ClientsPageContent({
  searchParams,
}: {
  searchParams: ClientsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const clientType = params.client_type ?? "all";
  const country = params.country ?? "all";
  const preferredLanguage = params.preferred_language ?? "all";
  const sort = params.sort ?? "newest";
  const showArchived = params.show_archived === "1";

  const [clients, filterOptions] = await Promise.all([
    getClients({
      q,
      client_type: clientType,
      country,
      preferred_language: preferredLanguage,
      sort,
      show_archived: showArchived,
    }),
    getClientFilterOptions(),
  ]);

  return (
    <ClientsList
      clients={clients}
      countries={filterOptions.countries}
      initialQuery={q}
      initialClientType={clientType}
      initialCountry={country}
      initialPreferredLanguage={preferredLanguage}
      initialSort={sort}
      initialShowArchived={showArchived}
    />
  );
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const t = await getTranslations("clients");

  return (
    <Suspense fallback={<LoadingScreen message={t("loading")} />}>
      <ClientsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
