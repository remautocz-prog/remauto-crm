"use client";

import { useTranslations } from "next-intl";
import { FileUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AttachmentsPlaceholder() {
  const t = useTranslations("documents");

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("attachmentsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-400">
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-700 px-4 py-8">
          <FileUp className="h-5 w-5 text-zinc-500" />
          <div>
            <p className="text-zinc-300">{t("attachmentsPlaceholder")}</p>
            <p className="mt-1 text-xs">{t("attachmentsSetupHint")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
