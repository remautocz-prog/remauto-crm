"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import {
  archiveClientAction,
  unarchiveClientAction,
} from "@/lib/actions/clients";
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

type ClientArchiveButtonProps = {
  clientId: number;
  isActive: boolean;
};

export function ClientArchiveButton({ clientId, isActive }: ClientArchiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const t = useTranslations("clients");
  const tActions = useTranslations("actions");

  function handleConfirm() {
    startTransition(async () => {
      if (isActive) {
        await archiveClientAction(clientId);
        return;
      }
      const result = await unarchiveClientAction(clientId);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={isActive ? "destructive" : "secondary"}>
          {isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
          {isActive ? t("archiveClient") : t("unarchiveClient")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? t("archiveClient") : t("unarchiveClient")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive ? t("archiveClientConfirm") : t("unarchiveClientConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isActive ? t("archiveClient") : t("unarchiveClient")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
