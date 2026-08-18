"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type DetailingCarSelectorOption,
  filterDetailingCarSelectorOptions,
  formatDetailingCarPrimaryLabel,
  formatDetailingCarSecondaryLabel,
} from "@/lib/detailing/car-selector";
import { cn } from "@/lib/utils";

type DetailingCrmCarSelectProps = {
  cars: DetailingCarSelectorOption[];
  value: number | null;
  onChange: (carId: number | null, car: DetailingCarSelectorOption | null) => void;
  loading?: boolean;
  id?: string;
  className?: string;
};

export function DetailingCrmCarSelect({
  cars,
  value,
  onChange,
  loading = false,
  id,
  className,
}: DetailingCrmCarSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("detailing");

  const selectedCar = cars.find((car) => car.id === value) ?? null;
  const filteredCars = useMemo(
    () => filterDetailingCarSelectorOptions(cars, query),
    [cars, query]
  );

  const displayLabel = selectedCar
    ? formatDetailingCarPrimaryLabel(selectedCar)
    : t("carSelector.placeholder");

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
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-red-500/40",
          loading && "cursor-wait opacity-70"
        )}
        onClick={() => {
          if (!loading) setOpen((prev) => !prev);
        }}
      >
        <span className={cn("truncate", !selectedCar && "text-zinc-500")}>
          {loading ? t("carSelector.loading") : displayLabel}
        </span>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin opacity-60" />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        )}
      </button>

      {open && !loading ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 shadow-lg">
          <div className="border-b border-zinc-800 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("carSelector.searchPlaceholder")}
                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredCars.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500">{t("carSelector.noCarsFound")}</p>
            ) : (
              filteredCars.map((car) => {
                const secondary = formatDetailingCarSecondaryLabel(car, {
                  includeMileage: true,
                });
                return (
                  <button
                    key={car.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-800",
                      value === car.id && "bg-zinc-800/80"
                    )}
                    onClick={() => {
                      onChange(car.id, car);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="text-sm text-zinc-100">
                      {formatDetailingCarPrimaryLabel(car)}
                    </span>
                    {secondary ? (
                      <span className="text-xs text-zinc-500">{secondary}</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
