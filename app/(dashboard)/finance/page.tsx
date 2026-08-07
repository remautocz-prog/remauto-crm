import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FinanceCenterView } from "@/components/finance/finance-center-view";
import { getFinanceCenterData } from "@/lib/queries/finance-center";

type FinancePageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    period?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("finance") };
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const params = await searchParams;
  const data = await getFinanceCenterData(params);

  return <FinanceCenterView data={data} />;
}
