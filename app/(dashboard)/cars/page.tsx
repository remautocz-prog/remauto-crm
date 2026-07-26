import type { Metadata } from "next";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getCars } from "@/lib/queries/modules";

export const metadata: Metadata = {
  title: "Cars",
};

export default async function CarsPage() {
  const cars = await getCars();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cars"
        description="Manage your vehicle inventory from Supabase."
      />
      <DataTable
        title="Inventory"
        headers={["Make", "Model", "Year", "Status", "VIN"]}
        rows={cars.map((car) => [
          car.make,
          car.model,
          String(car.year),
          car.status,
          car.vin ?? "—",
        ])}
      />
    </div>
  );
}
