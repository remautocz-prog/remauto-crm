import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CarForm } from "@/components/cars/car-form";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cars");
  return { title: t("addTitle") };
}

type NewCarPageProps = {
  searchParams: Promise<{ client_id?: string }>;
};

export default async function NewCarPage({ searchParams }: NewCarPageProps) {
  const params = await searchParams;
  const initialClientId = params.client_id ? Number(params.client_id) : null;
  const validClientId =
    initialClientId != null && !Number.isNaN(initialClientId) ? initialClientId : null;

  const [clients, profiles, t] = await Promise.all([
    getClientOptions(),
    getProfileOptions(),
    getTranslations("cars"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{t("addTitle")}</h2>
        <p className="text-zinc-400">{t("addDescription")}</p>
      </div>
      <CarForm
        mode="create"
        clients={clients}
        profiles={profiles}
        initialClientId={validClientId}
      />
    </div>
  );
}
