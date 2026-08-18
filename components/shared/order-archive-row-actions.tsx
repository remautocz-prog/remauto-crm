"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ActionResult = { success: boolean; error?: string };

type OrderArchiveRowActionsProps = {
  entityName: string;
  isArchived: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canPermanentlyDelete: boolean;
  onArchive: () => Promise<ActionResult>;
  onRestore: () => Promise<ActionResult>;
  onPermanentDelete?: () => Promise<ActionResult>;
  archiveLabel?: string;
  restoreLabel?: string;
  navigateAfterDelete?: string;
};

export function OrderArchiveRowActions({
  entityName,
  isArchived,
  canArchive,
  canRestore,
  canPermanentlyDelete,
  onArchive,
  onRestore,
  onPermanentDelete,
  archiveLabel,
  restoreLabel,
  navigateAfterDelete,
}: OrderArchiveRowActionsProps) {
  const router = useRouter();
  const t = useTranslations("archive");
  const tAccess = useTranslations("access");
  const tActions = useTranslations("actions");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const showArchive = !isArchived && canArchive;
  const showRestore = isArchived && canRestore;
  const showDelete = isArchived && canPermanentlyDelete && onPermanentDelete;

  if (!showArchive && !showRestore && !showDelete) {
    return null;
  }

  function runAction(action: () => Promise<ActionResult>, onSuccess?: () => void, navigateTo?: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? tAccess("deleteFailed"));
        return;
      }
      onSuccess?.();
      if (navigateTo) {
        router.push(navigateTo);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-zinc-400 hover:text-white"
            disabled={isPending}
            onClick={(event) => event.stopPropagation()}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
            <span className="sr-only">{tActions("actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
          {showArchive ? (
            <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" />
              {archiveLabel ?? t("archiveOrder")}
            </DropdownMenuItem>
          ) : null}
          {showRestore ? (
            <DropdownMenuItem onSelect={() => runAction(onRestore)}>
              <ArchiveRestore className="h-4 w-4" />
              {restoreLabel ?? t("restoreOrder")}
            </DropdownMenuItem>
          ) : null}
          {showDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {tAccess("deletePermanently")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{archiveLabel ?? t("archiveOrder")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("archiveConfirm", { name: entityName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                runAction(onArchive, () => setArchiveOpen(false));
              }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{tAccess("permanentDeletion")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("permanentDeleteConfirm", { name: entityName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                if (!onPermanentDelete) return;
                runAction(onPermanentDelete, () => setDeleteOpen(false), navigateAfterDelete);
              }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tAccess("deletePermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
