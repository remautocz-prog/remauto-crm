"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";
import {
  DOCUMENT_TEMPLATE_PLACEHOLDERS,
  PLACEHOLDER_GROUPS,
} from "@/lib/documents/template-placeholders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PlaceholdersPanel() {
  const t = useTranslations("documentGenerator");
  const [copied, setCopied] = useState<string | null>(null);

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("availablePlaceholders")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {PLACEHOLDER_GROUPS.map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t(`sections.${group}`)}
            </p>
            <ul className="space-y-2">
              {DOCUMENT_TEMPLATE_PLACEHOLDERS.filter((item) => item.group === group).map(
                (item) => (
                  <li
                    key={item.code}
                    className="flex flex-col gap-1 rounded-md border border-zinc-800/80 p-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <code className="text-xs text-emerald-300">{item.code}</code>
                      <p className="text-xs text-zinc-400">
                        {t(item.labelKey as never)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {t(item.exampleKey as never)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(item.code)}
                    >
                      {copied === item.code ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
