import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CarDetails } from "@/components/cars/car-details";
import {
  getCarById,
  getCarExpenses,
  getClientById,
  getClientOptions,
  getProfileById,
} from "@/lib/queries/cars";

type CarDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CarDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const carId = Number(id);
  const t = await getTranslations("cars");

  if (Number.isNaN(carId)) return { title: t("detailFallback") };

  try {
    const car = await getCarById(carId);
    return {
      title: `${car.brand} ${car.model}`,
    };
  } catch {
    return { title: t("detailFallback") };
  }
}

async function loadCarDetail(carId: number) {
  const [car, expenses, clients] = await Promise.all([
    getCarById(carId),
    getCarExpenses(carId),
    getClientOptions(),
  ]);

  const [client, owner, manager] = await Promise.all([
    car.client_id ? getClientById(car.client_id) : Promise.resolve(null),
    car.owner_client_id ? getClientById(car.owner_client_id) : Promise.resolve(null),
    car.manager_id ? getProfileById(car.manager_id) : Promise.resolve(null),
  ]);

  return {
    car,
    expenses,
    clients,
    clientName: client?.full_name ?? null,
    ownerName: owner?.full_name ?? null,
    managerName: manager?.full_name ?? null,
  };
}

export default async function CarDetailPage({ params }: CarDetailPageProps) {
  const { id } = await params;
  const carId = Number(id);

  if (Number.isNaN(carId)) notFound();

  let data;
  try {
    data = await loadCarDetail(carId);
  } catch {
    notFound();
  }

  return (
    <CarDetails
      car={data.car}
      expenses={data.expenses}
      clients={data.clients}
      clientName={data.clientName}
      ownerName={data.ownerName}
      managerName={data.managerName}
    />
  );
}
