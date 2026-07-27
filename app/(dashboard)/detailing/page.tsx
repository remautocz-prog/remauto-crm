import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getStatusLabel } from "@/lib/i18n/status-server";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDetailingOrders } from "@/lib/queries/modules";
import { isValidLocale, type AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("detailing") };
}

export default async function DetailingPage() {
  const [orders, t, tFields, tCommon, tEmpty, rawLocale] = await Promise.all([
    getDetailingOrders(),
    getTranslations("detailing"),
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
          tFields("service"),
          tFields("status"),
          tFields("amount"),
          tFields("scheduled"),
        ]}
        rows={await Promise.all(
          orders.map(async (order) => [
            order.service_type ?? tCommon("dash"),
            await getStatusLabel(order.status),
            formatCurrency(Number(order.price), locale),
            formatDate(order.scheduled_at, locale, tCommon("dash")),
          ])
        )}
        emptyMessage={tEmpty("default", {
          entity: t("tableTitle").toLowerCase(),
        })}
      />
    </div>
  );
}
