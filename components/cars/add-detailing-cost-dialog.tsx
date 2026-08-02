"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Receipt } from "lucide-react";
import { addDetailingCostToCarExpenseAction } from "@/lib/actions/cars";
import type { CarExpense } from "@/lib/types/cars";
import type { DetailingOrderWithServices } from "@/lib/types/detailing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { parseMoneyInput } from "@/lib/detailing/form-utils";

type AddDetailingCostDialogProps = {
  order: DetailingOrderWithServices;
  existingExpense: CarExpense | null;
};

export function AddDetailingCostDialog({
  order,
  existingExpense,
}: AddDetailingCostDialogProps) {
  const t = useTranslations("cars");
  const { formatCurrency } = useFormatters();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"final_price" | "manual">("manual");
  const [manualAmount, setManualAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!order.car_id || order.status !== "delivered" || order.final_price <= 0) {
    return null;
  }

  if (existingExpense) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm">
        <p className="font-medium text-zinc-300">{t("expenseAlreadyAdded")}</p>
        <Link
          href={`/cars/${order.car_id}`}
          className="mt-1 inline-block text-red-400 hover:text-red-300"
        >
          {t("viewLinkedVehicle")} →
        </Link>
      </div>
    );
  }

  const resolvedAmount =
    mode === "final_price"
      ? order.final_price
      : parseMoneyInput(manualAmount);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addDetailingCostToCarExpenseAction({
        carId: order.car_id!,
        detailingOrderId: order.id,
        amount: resolvedAmount,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Receipt className="h-4 w-4" />
        {t("addDetailingCostToVehicle")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle>{t("addDetailingCostToVehicle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              {t("sourceDetailingOrder")}: {order.order_number}
            </p>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="expense-mode"
                  checked={mode === "final_price"}
                  onChange={() => setMode("final_price")}
                  className="accent-red-500"
                />
                <span>
                  {t("useFinalOrderPrice")} ({formatCurrency(order.final_price)})
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="expense-mode"
                  checked={mode === "manual"}
                  onChange={() => setMode("manual")}
                  className="accent-red-500"
                />
                <span>{t("enterInternalExpense")}</span>
              </label>
            </div>

            {mode === "manual" ? (
              <div className="space-y-2">
                <Label htmlFor="manual-expense-amount">{t("internalExpenseAmount")}</Label>
                <Input
                  id="manual-expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualAmount}
                  onChange={(event) => setManualAmount(event.target.value)}
                  className="border-zinc-700 bg-zinc-950"
                />
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                {t("cancelAction")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || resolvedAmount <= 0}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("confirmAddExpense")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
