import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FinanceCenterView } from "@/components/finance/finance-center-view";
import { getFinanceCenterData } from "@/lib/queries/finance-center";

type FinancePageProps = {
  searchParams: Promise<{ period?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("finance") };
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const { period } = await searchParams;
  const data = await getFinanceCenterData(period);

  return <FinanceCenterView data={data} />;
}
