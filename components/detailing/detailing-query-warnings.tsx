import type { DetailingQueryWarning } from "@/lib/detailing/query-utils";
import { formatQueryWarning } from "@/lib/detailing/query-utils";
import { getTranslations } from "next-intl/server";

type DetailingQueryWarningsProps = {
  warnings: DetailingQueryWarning[];
};

export async function DetailingQueryWarnings({ warnings }: DetailingQueryWarningsProps) {
  if (!warnings.length) return null;

  const t = await getTranslations("detailing");

  return (
    <div
      className="rounded-xl border border-amber-600/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100"
      role="alert"
    >
      <p className="font-medium text-amber-300">{t("queryWarningTitle")}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-amber-100/90">
        {warnings.map((warning) => (
          <li key={`${warning.query}-${warning.message}`} className="font-mono text-xs">
            {formatQueryWarning(warning)}
          </li>
        ))}
      </ul>
    </div>
  );
}
