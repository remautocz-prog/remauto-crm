import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getStatusLabel } from "@/lib/i18n/status-server";
import { formatDate } from "@/lib/format";
import { getDocumentTasks } from "@/lib/queries/modules";
import { getDocumentTaskTitle } from "@/lib/types/database";
import { isValidLocale, type AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("documents") };
}

export default async function DocumentsPage() {
  const [tasks, t, tFields, tCommon, tEmpty, rawLocale] = await Promise.all([
    getDocumentTasks(),
    getTranslations("documents"),
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
          t("task"),
          tFields("type"),
          tFields("status"),
          t("carId"),
          tFields("created"),
        ]}
        rows={await Promise.all(
          tasks.map(async (task) => [
            getDocumentTaskTitle(task, (id) => t("taskFallback", { id })),
            task.type ?? tCommon("dash"),
            await getStatusLabel(task.status),
            task.car_id ? String(task.car_id) : tCommon("dash"),
            formatDate(task.created_at, locale, tCommon("dash")),
          ])
        )}
        emptyMessage={tEmpty("default", {
          entity: t("tableTitle").toLowerCase(),
        })}
      />
    </div>
  );
}
