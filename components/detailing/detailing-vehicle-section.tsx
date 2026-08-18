"use client";

import { useTranslations } from "next-intl";
import type { DetailingCarSelectorOption } from "@/lib/detailing/car-selector";
import { applyDetailingCarToVehicleFields } from "@/lib/detailing/car-selector";
import { DetailingCrmCarSelect } from "@/components/detailing/detailing-crm-car-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DetailingVehicleSize } from "@/lib/constants/detailing";
import { cn } from "@/lib/utils";

const VEHICLE_SIZES: DetailingVehicleSize[] = ["standard", "suv", "xxl"];

type DetailingVehicleSectionProps = {
  isInternalVehicle: boolean;
  cars: DetailingCarSelectorOption[];
  carsLoading?: boolean;
  carId: number | null;
  onCarIdChange: (carId: number | null) => void;
  vehicleMakeModel: string;
  onVehicleMakeModelChange: (value: string) => void;
  registrationNumber: string;
  onRegistrationNumberChange: (value: string) => void;
  vehicleSize: DetailingVehicleSize;
  onVehicleSizeChange: (value: DetailingVehicleSize) => void;
  vehicleSizeVariant?: "buttons" | "select";
  className?: string;
};

export function DetailingVehicleSection({
  isInternalVehicle,
  cars,
  carsLoading = false,
  carId,
  onCarIdChange,
  vehicleMakeModel,
  onVehicleMakeModelChange,
  registrationNumber,
  onRegistrationNumberChange,
  vehicleSize,
  onVehicleSizeChange,
  vehicleSizeVariant = "buttons",
  className,
}: DetailingVehicleSectionProps) {
  const t = useTranslations("detailing");

  function handleCarSelect(
    nextCarId: number | null,
    car: DetailingCarSelectorOption | null
  ) {
    onCarIdChange(nextCarId);
    if (car) {
      const fields = applyDetailingCarToVehicleFields(car);
      onVehicleMakeModelChange(fields.vehicleMakeModel);
      onRegistrationNumberChange(fields.registrationNumber);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {isInternalVehicle ? (
        <div className="space-y-1.5">
          <Label htmlFor="crm-car">{t("carSelector.label")}</Label>
          <DetailingCrmCarSelect
            id="crm-car"
            cars={cars}
            value={carId}
            loading={carsLoading}
            onChange={handleCarSelect}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="makeModel">{t("fields.makeModel")} *</Label>
          <Input
            id="makeModel"
            value={vehicleMakeModel}
            onChange={(event) => onVehicleMakeModelChange(event.target.value)}
            placeholder="BMW X5, Škoda Octavia…"
            className="bg-zinc-950/60"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration">{t("fields.registration")} *</Label>
          <Input
            id="registration"
            value={registrationNumber}
            onChange={(event) =>
              onRegistrationNumberChange(event.target.value.toUpperCase())
            }
            placeholder="1AB 2345"
            className="bg-zinc-950/60 uppercase"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("fields.vehicleSize")}</Label>
        {vehicleSizeVariant === "select" ? (
          <Select
            value={vehicleSize}
            onValueChange={(value) => onVehicleSizeChange(value as DetailingVehicleSize)}
          >
            <SelectTrigger className="bg-zinc-950/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {t(`vehicleSizes.${size}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {VEHICLE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onVehicleSizeChange(size)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition",
                  vehicleSize === size
                    ? "border-red-500/60 bg-red-500/10 text-white ring-1 ring-red-500/30"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700"
                )}
              >
                {t(`vehicleSizes.${size}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function isDetailingVehicleSectionComplete(input: {
  isInternalVehicle: boolean;
  carId: number | null;
  vehicleMakeModel: string;
  registrationNumber: string;
}): boolean {
  if (input.isInternalVehicle && input.carId != null) {
    return true;
  }
  return Boolean(input.vehicleMakeModel.trim() && input.registrationNumber.trim());
}
