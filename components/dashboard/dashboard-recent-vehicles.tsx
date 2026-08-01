"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Car, ClientOption } from "@/lib/types/cars";
import { CarStatusControl } from "@/components/cars/car-status-control";
import { DashboardSectionState } from "@/components/dashboard/dashboard-section-state";

type DashboardRecentVehiclesSectionProps = {
  cars: Car[];
  clients: ClientOption[];
  error?: string;
};

export function DashboardRecentVehiclesSection({
  cars,
  clients,
  error,
}: DashboardRecentVehiclesSectionProps) {
  const t = useTranslations("dashboard");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

  return (
    <DashboardSectionState
      title={t("recentVehicles")}
      error={error}
      isEmpty={!error && cars.length === 0}
      emptyMessage={t("noRecentVehicles")}
    >
      {toast ? (
        <p
          className={
            toast.type === "success"
              ? "mb-3 rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-400"
              : "mb-3 rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400"
          }
          role="status"
        >
          {toast.message}
        </p>
      ) : null}
      <ul className="divide-y divide-zinc-800">
        {cars.map((car) => (
          <li key={car.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <Link
                href={`/cars/${car.id}`}
                className="truncate text-sm font-medium text-white hover:text-red-400"
              >
                {car.brand} {car.model} ({car.year})
              </Link>
              {car.stock_number ? (
                <p className="truncate text-xs text-zinc-500">{car.stock_number}</p>
              ) : null}
            </div>
            <CarStatusControl
              car={car}
              clients={clients}
              compact
              onToast={setToast}
            />
          </li>
        ))}
      </ul>
    </DashboardSectionState>
  );
}
