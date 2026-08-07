"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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

type PermanentDeleteButtonProps = {
  label: string;
  description: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  variant?: "destructive" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
};

export function PermanentDeleteButton({
  label,
  description,
  onConfirm,
  variant = "destructive",
  size = "sm",
  className,
}: PermanentDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tAccess = useTranslations("access");
  const tActions = useTranslations("actions");

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) {
        setError(result.error ?? tAccess("deleteFailed"));
        return;
      }
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={isPending}>
          <Trash2 className="h-4 w-4" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tAccess("permanentDeletion")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tAccess("deletePermanently")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
