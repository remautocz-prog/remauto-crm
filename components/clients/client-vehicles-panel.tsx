"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Car, Link2, Loader2, Plus } from "lucide-react";
import type { Car as CarRecord } from "@/lib/types/cars";
import { calculateCarProfit } from "@/lib/cars/business-rules";
import { linkCarToClientAction } from "@/lib/actions/clients";
import { BusinessModelBadge } from "@/components/cars/business-model-badge";
import { CarStatusBadge } from "@/components/cars/car-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { translateBusinessModel } from "@/lib/i18n/business-model";

type LinkableCar = {
  id: number;
  brand: string;
  model: string;
  year: number;
  vin: string | null;
  registration_number: string | null;
};

type ClientVehiclesPanelProps = {
  clientId: number;
  cars: CarRecord[];
  carExpenseTotals: Record<number, number>;
  linkableCars: LinkableCar[];
};

function VehicleCard({
  car,
  expenses,
}: {
  car: CarRecord;
  expenses: number;
}) {
  const t = useTranslations("clients");
  const tFields = useTranslations("fields");
  const tBusinessModel = useTranslations("businessModel");
  const tCommon = useTranslations("common");
  const { formatCurrency } = useFormatters();
  const dash = tCommon("dash");
  const profit = calculateCarProfit(car, expenses);

  return (
    <div className="rounded-lg border border-zinc-800/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/cars/${car.id}`} className="font-medium text-white hover:text-red-400">
            {car.brand} {car.model} ({car.year})
          </Link>
          <div className="mt-2 flex flex-wrap gap-2">
            <CarStatusBadge status={car.status} />
            <BusinessModelBadge businessModel={car.business_model ?? "owned"} />
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/cars/${car.id}`}>{t("viewCar")}</Link>
        </Button>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <span className="text-zinc-500">{tFields("registrationNumber")}</span>
          <span className="text-zinc-200">{car.registration_number ?? dash}</span>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <span className="text-zinc-500">{tFields("vin")}</span>
          <span className="text-zinc-200">{car.vin ?? dash}</span>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <span className="text-zinc-500">{tFields("businessModel")}</span>
          <span className="text-zinc-200">
            {translateBusinessModel(tBusinessModel, car.business_model ?? "owned")}
          </span>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <span className="text-zinc-500">{tFields("purchasePrice")}</span>
          <span className="text-zinc-200">{formatCurrency(Number(car.purchase_price ?? 0))}</span>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <span className="text-zinc-500">{tFields("salePrice")}</span>
          <span className="text-zinc-200">
            {formatCurrency(Number(car.actual_sale_price ?? car.sale_price ?? 0))}
          </span>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <span className="text-zinc-500">{tFields("netProfit")}</span>
          <span className="text-zinc-200">{formatCurrency(profit.netProfit)}</span>
        </div>
      </div>
    </div>
  );
}

export function ClientVehiclesPanel({
  clientId,
  cars,
  carExpenseTotals,
  linkableCars,
}: ClientVehiclesPanelProps) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("clients");

  function handleLinkCar() {
    if (!selectedCarId) return;
    startTransition(async () => {
      const result = await linkCarToClientAction(clientId, Number(selectedCarId));
      if (result.success) {
        setLinkOpen(false);
        setSelectedCarId("");
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base text-white">{t("carsTitle")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4" />
            {t("linkExistingVehicle")}
          </Button>
          <Button asChild size="sm">
            <Link href={`/cars/new?client_id=${clientId}`}>
              <Plus className="h-4 w-4" />
              {t("createVehicleForClient")}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cars.length === 0 ? (
          <div className="space-y-3 text-sm text-zinc-400">
            <Car className="h-8 w-8 text-zinc-600" />
            <p>{t("noVehicles")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cars.map((car) => (
              <VehicleCard
                key={car.id}
                car={car}
                expenses={carExpenseTotals[car.id] ?? 0}
              />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("linkExistingVehicle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedCarId} onValueChange={setSelectedCarId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectVehicleToLink")} />
              </SelectTrigger>
              <SelectContent>
                {linkableCars.map((car) => (
                  <SelectItem key={car.id} value={String(car.id)}>
                    {car.brand} {car.model} ({car.year})
                    {car.registration_number ? ` · ${car.registration_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleLinkCar} disabled={!selectedCarId || isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t("linkExistingVehicle")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
