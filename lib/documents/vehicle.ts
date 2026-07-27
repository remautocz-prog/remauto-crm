import type { DocumentTask, DocumentTaskWithRelations } from "@/lib/types/documents";

export const DOCUMENT_VEHICLE_MODES = ["crm", "external"] as const;
export type DocumentVehicleMode = (typeof DOCUMENT_VEHICLE_MODES)[number];
export const DEFAULT_DOCUMENT_VEHICLE_MODE: DocumentVehicleMode = "external";

export type DocumentCarOption = {
  id: number;
  brand: string;
  model: string;
  year: number;
  vin: string | null;
  registration_number: string | null;
  client_id: number | null;
};

export type DocumentVehicleSnapshot = {
  mode: DocumentVehicleMode;
  carId: number | null;
  vin: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
};

export function resolveDocumentVehicleMode(
  task: Pick<DocumentTask, "vehicle_mode" | "car_id">
): DocumentVehicleMode {
  if (task.vehicle_mode === "crm" || task.vehicle_mode === "external") {
    return task.vehicle_mode;
  }
  return task.car_id ? "crm" : "external";
}

export function getDocumentVehicleSnapshot(
  task: DocumentTask,
  car?: DocumentTaskWithRelations["car"] | null
): DocumentVehicleSnapshot {
  const mode = resolveDocumentVehicleMode(task);

  if (mode === "crm" && task.car_id && car) {
    return {
      mode: "crm",
      carId: car.id,
      vin: car.vin,
      plate: car.registration_number,
      brand: car.brand,
      model: car.model,
      year: car.year,
    };
  }

  if (mode === "crm" && task.car_id) {
    return {
      mode: "crm",
      carId: task.car_id,
      vin: null,
      plate: null,
      brand: null,
      model: null,
      year: null,
    };
  }

  return {
    mode: "external",
    carId: null,
    vin: task.vehicle_vin,
    plate: task.vehicle_plate,
    brand: task.vehicle_brand,
    model: task.vehicle_model,
    year: task.vehicle_year,
  };
}

export function getDocumentVehicleTitle(
  task: DocumentTask,
  car?: DocumentTaskWithRelations["car"] | null,
  dash = "—"
): string {
  const snapshot = getDocumentVehicleSnapshot(task, car);
  if (snapshot.brand && snapshot.model) {
    return `${snapshot.brand} ${snapshot.model}${snapshot.year ? ` (${snapshot.year})` : ""}`;
  }
  if (snapshot.plate) return snapshot.plate;
  if (snapshot.vin) return snapshot.vin;
  if (snapshot.carId) return `#${snapshot.carId}`;
  return dash;
}

export function filterDocumentCars(
  cars: DocumentCarOption[],
  query: string,
  clientId?: number | null
): DocumentCarOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  return cars.filter((car) => {
    if (clientId != null && car.client_id != null && car.client_id !== clientId) {
      return false;
    }
    if (!normalizedQuery) return true;
    const haystack = [
      car.brand,
      car.model,
      String(car.year),
      car.vin ?? "",
      car.registration_number ?? "",
      String(car.id),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
