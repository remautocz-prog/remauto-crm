"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { restoreDocumentTaskAction } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";

type DocumentArchiveRestoreButtonProps = {
  taskId: number;
  compact?: boolean;
};

export function DocumentArchiveRestoreButton({
  taskId,
  compact = false,
}: DocumentArchiveRestoreButtonProps) {
  const router = useRouter();
  const t = useTranslations("documents");
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreDocumentTaskAction(taskId);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant={compact ? "outline" : "secondary"}
      size={compact ? "sm" : "default"}
      onClick={handleRestore}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArchiveRestore className="h-4 w-4" />
      )}
      {compact ? null : t("restoreTask")}
    </Button>
  );
}
