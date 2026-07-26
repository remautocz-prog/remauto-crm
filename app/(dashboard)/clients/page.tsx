import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getClients } from "@/lib/queries/modules";
import { getClientName } from "@/lib/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("clients") };
}

export default async function ClientsPage() {
  const [clients, t, tFields, tCommon, tNav, tEmpty] = await Promise.all([
      getClients(),
      getTranslations("clients"),
      getTranslations("fields"),
      getTranslations("common"),
      getTranslations("nav"),
      getTranslations("empty"),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <DataTable
        title={t("tableTitle")}
        headers={[
          tFields("name"),
          tFields("email"),
          tFields("phone"),
          tFields("company"),
        ]}
        rows={clients.map((client) => [
          getClientName(client, tCommon("dash")),
          client.email ?? tCommon("dash"),
          client.phone ?? tCommon("dash"),
          client.company ?? tCommon("dash"),
        ])}
        emptyMessage={tEmpty("default", {
          entity: tNav("clients").toLowerCase(),
        })}
      />
    </div>
  );
}
