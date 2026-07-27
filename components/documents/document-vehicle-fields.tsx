"use client";

import { useTranslations } from "next-intl";
import type { DocumentTaskFormInput } from "@/lib/types/documents";
import type { DocumentCarOption, DocumentVehicleMode } from "@/lib/documents/vehicle";
import {
  DocumentCrmCarSelect,
  DocumentCrmVehicleSummary,
} from "@/components/documents/document-crm-car-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DocumentVehicleFieldsProps = {
  form: DocumentTaskFormInput;
  cars: DocumentCarOption[];
  onChange: <K extends keyof DocumentTaskFormInput>(
    key: K,
    value: DocumentTaskFormInput[K]
  ) => void;
  fieldClass: (field: keyof DocumentTaskFormInput) => string;
  fieldErrors: Partial<Record<keyof DocumentTaskFormInput, string>>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function DocumentVehicleFields({
  form,
  cars,
  onChange,
  fieldClass,
  fieldErrors,
}: DocumentVehicleFieldsProps) {
  const t = useTranslations("documents");
  const tFields = useTranslations("fields");
  const isCrm = form.vehicle_mode === "crm";
  const selectedCar = cars.find((car) => car.id === form.car_id) ?? null;

  function setVehicleMode(mode: DocumentVehicleMode) {
    onChange("vehicle_mode", mode);
    if (mode === "crm") {
      onChange("vehicle_vin", "");
      onChange("vehicle_plate", "");
      onChange("vehicle_brand", "");
      onChange("vehicle_model", "");
      onChange("vehicle_year", null);
    } else {
      onChange("car_id", null);
    }
  }

  return (
    <div className="space-y-4 md:col-span-2">
      <div className="space-y-2">
        <Label>{t("vehicleModeLabel")}</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
            <input
              type="radio"
              name="document_vehicle_mode"
              checked={!isCrm}
              onChange={() => setVehicleMode("external")}
              className="accent-red-500"
            />
            {t("vehicleModeExternal")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
            <input
              type="radio"
              name="document_vehicle_mode"
              checked={isCrm}
              onChange={() => setVehicleMode("crm")}
              className="accent-red-500"
            />
            {t("vehicleModeCrm")}
          </label>
        </div>
      </div>

      {isCrm ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="document_crm_car">{t("crmVehicleSearch")}</Label>
            <DocumentCrmCarSelect
              id="document_crm_car"
              cars={cars}
              value={form.car_id}
              clientId={form.client_id}
              onChange={(carId) => onChange("car_id", carId)}
            />
          </div>
          <DocumentCrmVehicleSummary car={selectedCar} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="document_vehicle_vin">{tFields("vin")}</Label>
            <Input
              id="document_vehicle_vin"
              value={form.vehicle_vin ?? ""}
              onChange={(event) => onChange("vehicle_vin", event.target.value)}
              className={fieldClass("vehicle_vin")}
            />
            <FieldError message={fieldErrors.vehicle_vin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_vehicle_plate">{tFields("registrationNumber")}</Label>
            <Input
              id="document_vehicle_plate"
              value={form.vehicle_plate ?? ""}
              onChange={(event) => onChange("vehicle_plate", event.target.value)}
              className={fieldClass("vehicle_plate")}
            />
            <FieldError message={fieldErrors.vehicle_plate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_vehicle_brand">{tFields("brand")}</Label>
            <Input
              id="document_vehicle_brand"
              value={form.vehicle_brand ?? ""}
              onChange={(event) => onChange("vehicle_brand", event.target.value)}
              className={fieldClass("vehicle_brand")}
            />
            <FieldError message={fieldErrors.vehicle_brand} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_vehicle_model">{tFields("model")}</Label>
            <Input
              id="document_vehicle_model"
              value={form.vehicle_model ?? ""}
              onChange={(event) => onChange("vehicle_model", event.target.value)}
              className={fieldClass("vehicle_model")}
            />
            <FieldError message={fieldErrors.vehicle_model} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_vehicle_year">{tFields("year")}</Label>
            <Input
              id="document_vehicle_year"
              type="number"
              value={form.vehicle_year ?? ""}
              onChange={(event) =>
                onChange(
                  "vehicle_year",
                  event.target.value === "" ? null : Number(event.target.value)
                )
              }
              className={cn(fieldClass("vehicle_year"), "md:col-span-1")}
            />
            <FieldError message={fieldErrors.vehicle_year} />
          </div>
        </div>
      )}
    </div>
  );
}
