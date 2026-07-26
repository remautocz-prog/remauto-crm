import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getFinanceTypeLabel } from "@/lib/i18n/status-server";
import { formatCurrency, formatDate } from "@/lib/format";
import { getFinanceTransactions } from "@/lib/queries/modules";
import { isValidLocale, type AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("finance") };
}

export default async function FinancePage() {
  const [transactions, t, tFields, tCommon, tEmpty, rawLocale] =
    await Promise.all([
      getFinanceTransactions(),
      getTranslations("finance"),
      getTranslations("fields"),
      getTranslations("common"),
      getTranslations("empty"),
      getLocale(),
    ]);
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <DataTable
        title={t("tableTitle")}
        headers={[
          tFields("type"),
          tFields("category"),
          tFields("amount"),
          tFields("date"),
          tFields("description"),
        ]}
        rows={await Promise.all(
          transactions.map(async (tx) => [
            await getFinanceTypeLabel(tx.type),
            tx.category,
            formatCurrency(Number(tx.amount), locale),
            formatDate(tx.transaction_date, locale, tCommon("dash")),
            tx.description ?? tCommon("dash"),
          ])
        )}
        emptyMessage={tEmpty("default", {
          entity: t("tableTitle").toLowerCase(),
        })}
      />
    </div>
  );
}
