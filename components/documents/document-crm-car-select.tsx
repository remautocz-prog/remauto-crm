"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type DocumentCarOption,
  filterDocumentCars,
} from "@/lib/documents/vehicle";
import { cn } from "@/lib/utils";

type DocumentCrmCarSelectProps = {
  cars: DocumentCarOption[];
  value: number | null;
  clientId?: number | null;
  onChange: (carId: number | null) => void;
  id?: string;
  className?: string;
};

export function DocumentCrmCarSelect({
  cars,
  value,
  clientId,
  onChange,
  id,
  className,
}: DocumentCrmCarSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("documents");
  const tFields = useTranslations("fields");

  const selectedCar = cars.find((car) => car.id === value) ?? null;
  const filteredCars = useMemo(
    () => filterDocumentCars(cars, query, clientId),
    [cars, query, clientId]
  );

  const displayLabel = selectedCar
    ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.year})`
    : t("searchCrmVehicle");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-red-500/40",
          className
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={cn(!selectedCar && "text-zinc-500")}>{displayLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 shadow-lg">
          <div className="border-b border-zinc-800 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchCrmVehicle")}
                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setQuery("");
              }}
            >
              {tFields("notSelected")}
            </button>
            {filteredCars.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500">{t("noCrmVehiclesFound")}</p>
            ) : (
              filteredCars.map((car) => (
                <button
                  key={car.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-800",
                    value === car.id && "bg-zinc-800/80"
                  )}
                  onClick={() => {
                    onChange(car.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm text-zinc-100">
                    {car.brand} {car.model} ({car.year})
                  </span>
                  <span className="text-xs text-zinc-500">
                    {[car.registration_number, car.vin].filter(Boolean).join(" · ") ||
                      `#${car.id}`}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentCrmVehicleSummary({
  car,
  className,
}: {
  car: DocumentCarOption | null;
  className?: string;
}) {
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const dash = tCommon("dash");

  if (!car) return null;

  const rows = [
    { label: tFields("vin"), value: car.vin ?? dash },
    { label: tFields("registrationNumber"), value: car.registration_number ?? dash },
    { label: tFields("brand"), value: car.brand },
    { label: tFields("model"), value: car.model },
    { label: tFields("year"), value: String(car.year) },
  ];

  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/40 p-3", className)}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {car.brand} {car.model} ({car.year})
      </p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-zinc-500">{row.label}</dt>
            <dd className="text-sm text-zinc-200">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
