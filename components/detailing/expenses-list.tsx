"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Receipt, Hash, Tags } from "lucide-react";
import {
  DETAILING_EXPENSE_CATEGORIES,
  DETAILING_PAYMENT_METHODS,
  type DetailingExpenseCategory,
  type DetailingPaymentMethod,
} from "@/lib/constants/detailing";
import {
  createDetailingExpenseAction,
  updateDetailingExpenseAction,
} from "@/lib/actions/detailing";
import type { DetailingExpense, DetailingExpenseMonthSummary } from "@/lib/types/detailing";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { DetailingStatCard } from "@/components/detailing/detailing-stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingExpensesListProps = {
  expenses: DetailingExpense[];
  monthSummary: DetailingExpenseMonthSummary;
};

export function DetailingExpensesList({
  expenses,
  monthSummary,
}: DetailingExpensesListProps) {
  const t = useTranslations("detailing");
  const { formatCurrency, formatDate } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<DetailingExpenseCategory>("other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<DetailingPaymentMethod | "">("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DetailingExpense | null>(null);
  const [editForm, setEditForm] = useState({
    expense_date: "",
    category: "other" as DetailingExpenseCategory,
    description: "",
    amount: "",
    payment_method: "" as DetailingPaymentMethod | "",
  });

  function handleCreate() {
    startTransition(async () => {
      const result = await createDetailingExpenseAction({
        expense_date: expenseDate,
        category,
        description,
        amount: Number(amount.replace(",", ".")) || 0,
        payment_method: paymentMethod || null,
      });
      setMessage(result.success ? t("expenseSaved") : result.error);
      if (result.success) {
        setDescription("");
        setAmount("");
        setPaymentMethod("");
      }
    });
  }

  function openEdit(expense: DetailingExpense) {
    setEditingExpense(expense);
    setEditForm({
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      payment_method: expense.payment_method ?? "",
    });
    setEditOpen(true);
  }

  function saveEdit() {
    if (!editingExpense) return;
    startTransition(async () => {
      const result = await updateDetailingExpenseAction({
        id: editingExpense.id,
        expense_date: editForm.expense_date,
        category: editForm.category,
        description: editForm.description,
        amount: Number(editForm.amount.replace(",", ".")) || 0,
        payment_method: editForm.payment_method || null,
      });
      setMessage(result.success ? t("expenseSaved") : result.error);
      if (result.success) setEditOpen(false);
    });
  }

  return (
    <div className="space-y-8">
      <DetailingPageHeader title={t("expensesTitle")} description={t("expensesDescription")} />

      <div className="grid gap-3 sm:grid-cols-3">
        <DetailingStatCard label={t("metrics.expensesThisMonth")} value={formatCurrency(monthSummary.total)} icon={Receipt} iconAccent="text-orange-400" />
        <DetailingStatCard label={t("metrics.expenseCount")} value={String(monthSummary.count)} icon={Hash} iconAccent="text-blue-400" />
        <DetailingStatCard
          label={t("metrics.largestCategory")}
          value={monthSummary.largestCategory ? t(`expenseCategories.${monthSummary.largestCategory}`) : "—"}
          icon={Tags}
          iconAccent="text-purple-400"
        />
      </div>

      <DetailingSection title={t("addExpense")}>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label>{t("fields.date")}</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("fields.category")}</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as DetailingExpenseCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DETAILING_EXPENSE_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>{t(`expenseCategories.${item}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>{t("fields.description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("fields.amount")}</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("fields.paymentMethod")}</Label>
            <Select value={paymentMethod || "none"} onValueChange={(value) => setPaymentMethod(value === "none" ? "" : (value as DetailingPaymentMethod))}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {DETAILING_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>{t(`paymentMethods.${method}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={isPending || !description.trim()} size="lg">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("saveExpense")}
            </Button>
          </div>
        </div>
      </DetailingSection>

      <DetailingSection title={t("expensesTableTitle")} noPadding>
        <DetailingTable
          headers={[
            t("fields.date"),
            t("fields.category"),
            t("fields.description"),
            t("fields.amount"),
            t("fields.paymentMethod"),
            "",
          ]}
          isEmpty={!expenses.length}
          emptyMessage={t("noExpenses")}
        >
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-zinc-900/40">
              <td className="px-4 py-3">{formatDate(expense.expense_date)}</td>
              <td className="px-4 py-3">{t(`expenseCategories.${expense.category}`)}</td>
              <td className="px-4 py-3">{expense.description}</td>
              <td className="px-4 py-3 font-medium">{formatCurrency(expense.amount)}</td>
              <td className="px-4 py-3">
                {expense.payment_method ? t(`paymentMethods.${expense.payment_method}`) : "—"}
              </td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="icon" onClick={() => openEdit(expense)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </DetailingTable>
      </DetailingSection>

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editExpense")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>{t("fields.date")}</Label>
              <Input type="date" value={editForm.expense_date} onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.category")}</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v as DetailingExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DETAILING_EXPENSE_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>{t(`expenseCategories.${item}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("fields.description")}</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.amount")}</Label>
              <Input value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.paymentMethod")}</Label>
              <Select value={editForm.payment_method || "none"} onValueChange={(v) => setEditForm({ ...editForm, payment_method: v === "none" ? "" : (v as DetailingPaymentMethod) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {DETAILING_PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>{t(`paymentMethods.${method}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("cancel")}</Button>
            <Button onClick={saveEdit} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("saveExpense")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
