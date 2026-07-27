"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { deleteClientAction } from "@/lib/actions/clients";
import type { ClientRelatedCounts } from "@/lib/types/clients";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeleteClientButtonProps = {
  clientId: number;
  relatedCounts: ClientRelatedCounts;
};

export function DeleteClientButton({
  clientId,
  relatedCounts,
}: DeleteClientButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const t = useTranslations("clients");
  const tActions = useTranslations("actions");

  const totalRelated =
    relatedCounts.carsAsBuyer +
    relatedCounts.carsAsOwner +
    relatedCounts.documentTasks +
    relatedCounts.detailingOrders +
    relatedCounts.financeTransactions;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteClientAction(clientId);
      if (!result.success) {
        setError(result.error);
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4" />
            {tActions("delete")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {totalRelated > 0
                ? t("deleteBlockedRelated", { count: totalRelated })
                : t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {totalRelated > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
              {relatedCounts.carsAsBuyer + relatedCounts.carsAsOwner > 0 ? (
                <li>
                  {t("relatedCars", {
                    count: relatedCounts.carsAsBuyer + relatedCounts.carsAsOwner,
                  })}
                </li>
              ) : null}
              {relatedCounts.documentTasks > 0 ? (
                <li>{t("relatedDocuments", { count: relatedCounts.documentTasks })}</li>
              ) : null}
              {relatedCounts.detailingOrders > 0 ? (
                <li>{t("relatedDetailing", { count: relatedCounts.detailingOrders })}</li>
              ) : null}
              {relatedCounts.financeTransactions > 0 ? (
                <li>{t("relatedFinance", { count: relatedCounts.financeTransactions })}</li>
              ) : null}
            </ul>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
            {totalRelated === 0 ? (
              <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {t("confirmArchive")}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
