import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { CarForm } from "@/components/cars/car-form";
import { Button } from "@/components/ui/button";
import {
  getCarById,
  getClientOptions,
  getProfileOptions,
} from "@/lib/queries/cars";

type EditCarPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cars");
  return { title: t("editTitle") };
}

async function loadEditCar(carId: number) {
  const [car, clients, profiles] = await Promise.all([
    getCarById(carId),
    getClientOptions(),
    getProfileOptions(),
  ]);

  return { car, clients, profiles };
}

export default async function EditCarPage({ params }: EditCarPageProps) {
  const { id } = await params;
  const carId = Number(id);
  if (Number.isNaN(carId)) notFound();

  let data;
  try {
    data = await loadEditCar(carId);
  } catch {
    notFound();
  }

  const { car, clients, profiles } = data;
  const t = await getTranslations("cars");
  const tActions = await getTranslations("actions");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
          <Link href={`/cars/${car.id}`}>
            <ArrowLeft className="h-4 w-4" />
            {tActions("backToCard")}
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">{t("editTitle")}</h2>
          <p className="text-zinc-400">
            {car.brand} {car.model} ({car.year})
          </p>
        </div>
      </div>
      <CarForm mode="edit" car={car} clients={clients} profiles={profiles} />
    </div>
  );
}
