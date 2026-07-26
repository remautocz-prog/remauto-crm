"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { CarExpense, CarExpenseInput } from "@/lib/types/cars";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/constants/cars";
import {
  createCarExpenseAction,
  updateCarExpenseAction,
} from "@/lib/actions/cars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { translateExpenseCategory } from "@/lib/i18n/status";

type ExpenseFormDialogProps = {
  carId: number;
  expense?: CarExpense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toExpenseForm(expense?: CarExpense): CarExpenseInput {
  return {
    category: expense?.category ?? "other",
    amount: expense ? Number(expense.amount) : 0,
    description: expense?.description ?? "",
    expense_date: expense?.expense_date ?? new Date().toISOString().slice(0, 10),
  };
}

export function ExpenseFormDialog({
  carId,
  expense,
  open,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CarExpenseInput>(toExpenseForm(expense));

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tExpenseCategories = useTranslations("expenseCategories");

  function handleOpenChange(next: boolean) {
    if (next) setForm(toExpenseForm(expense));
    setError(null);
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = expense
        ? await updateCarExpenseAction(carId, expense.id, form)
        : await createCarExpenseAction(carId, form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {expense ? t("editExpense") : t("addExpense")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{tFields("category")} *</Label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORY_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateExpenseCategory(tExpenseCategories, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">{tFields("amount")} *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  amount: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense_date">{tFields("date")} *</Label>
            <Input
              id="expense_date"
              type="date"
              required
              value={form.expense_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, expense_date: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{tFields("description")}</Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>
          {error ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tActions("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
