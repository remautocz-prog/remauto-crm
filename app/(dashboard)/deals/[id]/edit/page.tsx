import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DealForm } from "@/components/deals/deal-form";
import { DealHandoverPanel } from "@/components/deals/deal-handover-panel";
import { PageHeader } from "@/components/shared/page-shell";
import { getClientOptions, getProfileOptions } from "@/lib/queries/cars";
import { getDealById } from "@/lib/queries/deals";
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

type EditDealPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditDealPageProps): Promise<Metadata> {
  const { id } = await params;
  const deal = await getDealById(id);
  const t = await getTranslations("deals");
  return { title: deal ? `${t("editDeal")} ${deal.deal_number}` : t("editDeal") };
}

export default async function EditDealPage({ params }: EditDealPageProps) {
  const { id } = await params;
  const [deal, clients, cars, profiles, t] = await Promise.all([
    getDealById(id),
    getClientOptions(),
    getCarOptions(),
    getProfileOptions(),
    getTranslations("deals"),
  ]);

  if (!deal) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("editDeal")} ${deal.deal_number}`} description={t("editDealDescription")} />
      <DealForm mode="edit" deal={deal} clients={clients} cars={cars} profiles={profiles} />
      <DealHandoverPanel deal={deal} />
    </div>
  );
}
