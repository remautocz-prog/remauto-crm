import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/shared/page-shell";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";
import { createClient } from "@/lib/supabase/server";

async function getCarOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("id, brand, model, year, vin, registration_number")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("deals");
  return { title: t("newDeal") };
}

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; vehicle_a_id?: string }>;
}) {
  const params = await searchParams;
  const initialClientId = params.client_id ? Number(params.client_id) : null;
  const initialVehicleAId = params.vehicle_a_id ? Number(params.vehicle_a_id) : null;

  const [clients, cars, profiles, t] = await Promise.all([
    getClientOptions(),
    getCarOptions(),
    getProfileOptions(),
    getTranslations("deals"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("newDeal")} description={t("newDealDescription")} />
      <DealForm
        mode="create"
        clients={clients}
        cars={cars}
        profiles={profiles}
        initialClientId={Number.isFinite(initialClientId) ? initialClientId : null}
        initialVehicleAId={Number.isFinite(initialVehicleAId) ? initialVehicleAId : null}
      />
    </div>
  );
}
