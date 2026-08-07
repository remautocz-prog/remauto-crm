"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Car, CarExpense } from "@/lib/types/cars";
import { deleteCarExpenseAction } from "@/lib/actions/cars";
import { ExpenseFormDialog } from "@/components/cars/expense-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { summarizeCarExpenses } from "@/lib/cars/display-helpers";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateExpenseCategory } from "@/lib/i18n/status";

type CarExpensesSectionProps = {
  car: Car;
  expenses: CarExpense[];
  canPermanentlyDelete?: boolean;
  canManageExpenses?: boolean;
};

export function CarExpensesSection({
  car,
  expenses,
  canPermanentlyDelete = false,
  canManageExpenses = false,
}: CarExpensesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<CarExpense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<CarExpense | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const tExpenseCategories = useTranslations("expenseCategories");
  const { formatCurrency, formatDate } = useFormatters();
  const dash = tCommon("dash");

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const summary = summarizeCarExpenses(expenses, (category) =>
    translateExpenseCategory(tExpenseCategories, category as never)
  );

  function handleDelete() {
    if (!deleteExpense) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteCarExpenseAction(car.id, deleteExpense.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDeleteExpense(null);
      router.refresh();
    });
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base text-white">{tFields("expenses")}</CardTitle>
          <p className="text-sm text-zinc-400">
            {tFields("total")}: {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageExpenses ? (
            <>
              <Button variant="outline" onClick={() => setCommissionOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("addThirdPartyCommission")}
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {tActions("add")}
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenses.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <p className="text-xs text-zinc-500">{tFields("totalExpenses")}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatCurrency(summary.total)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <p className="text-xs text-zinc-500">{t("largestExpenseCategory")}</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">
                {summary.largestCategory ?? dash}
              </p>
              {summary.largestCategory ? (
                <p className="text-xs tabular-nums text-zinc-500">
                  {formatCurrency(summary.largestCategoryAmount)}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <p className="text-xs text-zinc-500">{t("latestExpense")}</p>
              {summary.latestExpense ? (
                <>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {translateExpenseCategory(
                      tExpenseCategories,
                      summary.latestExpense.category
                    )}
                  </p>
                  <p className="text-xs tabular-nums text-zinc-500">
                    {formatCurrency(Number(summary.latestExpense.amount))} ·{" "}
                    {formatDate(summary.latestExpense.expense_date, dash)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">{dash}</p>
              )}
            </div>
            {summary.thirdPartyCommissionTotal > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-xs text-zinc-500">{t("thirdPartyCommissionTotal")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {formatCurrency(summary.thirdPartyCommissionTotal)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        {expenses.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">{t("expenseEmpty")}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{tFields("date")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("category")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("description")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("amount")}</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-zinc-800/80">
                    <td className="px-4 py-3 text-zinc-300">
                      {formatDate(expense.expense_date, dash)}
                    </td>
                    <td className="px-4 py-3 text-zinc-200">
                      {translateExpenseCategory(tExpenseCategories, expense.category)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {expense.description ?? dash}
                    </td>
                    <td className="px-4 py-3 text-zinc-200">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="px-4 py-3">
                      {canManageExpenses || canPermanentlyDelete ? (
                        <div className="flex justify-end gap-2">
                          {canManageExpenses ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditExpense(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canPermanentlyDelete ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteExpense(expense)}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ExpenseFormDialog
        carId={car.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <ExpenseFormDialog
        carId={car.id}
        open={commissionOpen}
        onOpenChange={setCommissionOpen}
        defaultCategory="third_party_commission"
        title={t("addThirdPartyCommission")}
        descriptionPlaceholder={t("commissionRecipientNotePlaceholder")}
      />

      <ExpenseFormDialog
        carId={car.id}
        expense={editExpense ?? undefined}
        open={Boolean(editExpense)}
        onOpenChange={(open) => !open && setEditExpense(null)}
      />

      <AlertDialog
        open={Boolean(deleteExpense)}
        onOpenChange={(open) => !open && setDeleteExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteExpenseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteExpenseDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
