"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { DOCUMENT_TASK_STATUS_VALUES } from "@/lib/constants/documents";
import { changeDocumentStatusAction } from "@/lib/actions/documents";
import type { DocumentStatusChangeInput } from "@/lib/types/documents";
import { translateDocumentStatus } from "@/lib/i18n/documents";
import { normalizeDocumentTaskStatus } from "@/lib/documents/status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
  currentStatus: string;
};

export function StatusChangeDialog({
  open,
  onOpenChange,
  taskId,
  currentStatus,
}: StatusChangeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmUnpaidDelivery, setConfirmUnpaidDelivery] = useState(false);
  const [form, setForm] = useState<DocumentStatusChangeInput>({
    status: normalizeDocumentTaskStatus(currentStatus),
    result_notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        status: normalizeDocumentTaskStatus(currentStatus),
        result_notes: "",
      });
      setConfirmUnpaidDelivery(false);
      setError(null);
    }
  }, [open, currentStatus]);

  const t = useTranslations("documents");
  const tActions = useTranslations("actions");
  const tStatus = useTranslations("documents.status");
  const tValidation = useTranslations("documents.validation");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await changeDocumentStatusAction(taskId, {
        ...form,
        confirmUnpaidDelivery,
      });
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors?.status === tValidation("deliveredUnpaidWarning")) {
          // keep dialog open for confirmation
        }
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setForm({
            status: normalizeDocumentTaskStatus(currentStatus),
            result_notes: "",
          });
          setConfirmUnpaidDelivery(false);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("changeStatus")}</DialogTitle>
          <DialogDescription>{t("changeStatusDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("newStatus")}</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TASK_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateDocumentStatus(tStatus, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(form.status === "COMPLETED" || form.status === "DELIVERED") && (
            <div className="space-y-2">
              <Label htmlFor="result_notes">{t("completionNotes")}</Label>
              <Textarea
                id="result_notes"
                value={form.result_notes ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, result_notes: e.target.value }))
                }
              />
            </div>
          )}
          {error?.includes(tValidation("deliveredUnpaidWarning")) ? (
            <label className="flex items-center gap-2 text-sm text-amber-200">
              <input
                type="checkbox"
                checked={confirmUnpaidDelivery}
                onChange={(e) => setConfirmUnpaidDelivery(e.target.checked)}
              />
              {t("confirmUnpaidDelivery")}
            </label>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {tActions("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t("changeStatus")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
