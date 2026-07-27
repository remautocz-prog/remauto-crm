"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { PAYMENT_METHOD_VALUES } from "@/lib/constants/documents";
import { registerDocumentPaymentAction } from "@/lib/actions/documents";
import type { DocumentPaymentInput } from "@/lib/types/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type PaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
};

export function PaymentDialog({ open, onOpenChange, taskId }: PaymentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentPaymentInput>({
    amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "bank_transfer",
    note: "",
  });

  const t = useTranslations("documents");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tMethods = useTranslations("documents.paymentMethods");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerDocumentPaymentAction(taskId, form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("registerPayment")}</DialogTitle>
          <DialogDescription>{t("registerPaymentDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_amount">{tFields("amount")}</Label>
            <Input
              id="payment_amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.amount || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_date">{tFields("date")}</Label>
            <Input
              id="payment_date"
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("paymentMethod")}</Label>
            <Select
              value={form.payment_method}
              onValueChange={(value) => setForm((prev) => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tMethods(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_note">{tFields("notes")}</Label>
            <Textarea
              id="payment_note"
              value={form.note ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {tActions("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t("registerPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
