"use client";

import Link from "next/link";
import type { ClientDuplicateMatch } from "@/lib/types/clients";
import { useTranslations } from "next-intl";
import { getClientDisplayName } from "@/lib/clients/validation";

type DuplicateWarningProps = {
  duplicates: ClientDuplicateMatch[];
};

export function DuplicateWarning({ duplicates }: DuplicateWarningProps) {
  const t = useTranslations("clients");

  if (duplicates.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-600/30 bg-amber-600/10 px-3 py-3 text-sm text-amber-200">
      <p className="font-medium">{t("possibleDuplicateClient")}</p>
      <ul className="mt-2 space-y-2">
        {duplicates.map((duplicate) => (
          <li key={duplicate.id}>
            <Link href={`/clients/${duplicate.id}`} className="underline hover:text-white">
              {getClientDisplayName(duplicate)}
            </Link>
            <span className="text-amber-300/80">
              {" "}
              — {t(`duplicateReason.${duplicate.matchReason}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
