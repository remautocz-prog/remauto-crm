import { getTranslations } from "next-intl/server";
import type { DetailingReadinessResult } from "@/lib/detailing/query-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DetailingDatabaseNotReadyProps = {
  readiness?: DetailingReadinessResult;
};

export async function DetailingDatabaseNotReady({ readiness }: DetailingDatabaseNotReadyProps) {
  const t = await getTranslations("detailing");
  const failedChecks = readiness?.checks.filter((check) => !check.ok) ?? [];

  return (
    <Card className="border-amber-600/30 bg-amber-950/20">
      <CardHeader>
        <CardTitle className="text-amber-300">{t("databaseNotReadyTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-300">
        <p>{t("databaseNotReadyMessage")}</p>
        {readiness?.missingTables.length ? (
          <div>
            <p className="font-medium text-amber-200">{t("missingTablesTitle")}</p>
            <ul className="mt-1 list-inside list-disc font-mono text-xs text-zinc-400">
              {readiness.missingTables.map((table) => (
                <li key={table}>{table}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {failedChecks.length ? (
          <div>
            <p className="font-medium text-amber-200">{t("readinessCheckLogTitle")}</p>
            <ul className="mt-1 space-y-1 font-mono text-xs text-zinc-500">
              {failedChecks.map((check) => (
                <li key={check.table}>
                  {check.table}: {check.error?.code ?? "error"} — {check.error?.message ?? "unknown"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="font-mono text-xs text-zinc-500">
          supabase/migrations/018_detailing_module.sql
          <br />
          supabase/migrations/019_detailing_services_seed.sql
        </p>
      </CardContent>
    </Card>
  );
}
