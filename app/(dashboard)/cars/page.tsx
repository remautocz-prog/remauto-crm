import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CarsList } from "@/components/cars/cars-list";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { getCars, getClientOptions, getCarExpenseTotalsByCarIds } from "@/lib/queries/cars";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("cars") };
}

type CarsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    business_model?: string;
    sort?: string;
  }>;
};

async function CarsPageContent({
  searchParams,
}: {
  searchParams: CarsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const businessModel = params.business_model ?? "all";
  const sort = params.sort ?? "newest";
  const [cars, clients] = await Promise.all([
    getCars({ q, status, business_model: businessModel, sort }),
    getClientOptions(),
  ]);
  const clientNames = Object.fromEntries(clients.map((client) => [client.id, client.full_name]));
  const expenseTotals = await getCarExpenseTotalsByCarIds(cars.map((car) => car.id));

  return (
    <CarsList
      cars={cars}
      clientNames={clientNames}
      clients={clients}
      expenseTotals={expenseTotals}
      initialQuery={q}
      initialStatus={status}
      initialBusinessModel={businessModel}
      initialSort={sort}
    />
  );
}

export default async function CarsPage({ searchParams }: CarsPageProps) {
  const t = await getTranslations("cars");

  return (
    <Suspense fallback={<LoadingScreen message={t("loading")} />}>
      <CarsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
