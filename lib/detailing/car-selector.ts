import { CAR_STATUS_VALUES } from "@/lib/constants/cars";

/** Minimal CRM car fields for the detailing internal-vehicle selector. */
export type DetailingCarSelectorOption = {
  id: number;
  brand: string;
  model: string;
  year: number;
  vin: string | null;
  registration_number: string | null;
  status: string;
  mileage: number | null;
  stock_number: string | null;
};

export const DETAILING_CAR_SELECTOR_STATUSES = [
  ...CAR_STATUS_VALUES,
  "in_progress",
  "new",
] as const;

const STATUS_SORT_ORDER: Record<string, number> = {
  in_stock: 0,
  reserved: 1,
  in_transit: 2,
  in_progress: 3,
  new: 4,
  sold: 5,
};

const DEFAULT_STATUS_SORT = 99;

export function isDetailingCarSelectorStatus(status: string): boolean {
  return (DETAILING_CAR_SELECTOR_STATUSES as readonly string[]).includes(status);
}

export function formatVinSuffix(
  vin: string | null | undefined,
  length = 6
): string | null {
  const normalized = vin?.trim();
  if (!normalized) return null;
  if (normalized.length <= length) return normalized;
  return `…${normalized.slice(-length)}`;
}

export function formatDetailingCarPrimaryLabel(
  car: Pick<DetailingCarSelectorOption, "brand" | "model">
): string {
  return `${car.brand} ${car.model}`.trim();
}

export function formatDetailingCarSecondaryLabel(
  car: Pick<
    DetailingCarSelectorOption,
    "registration_number" | "vin" | "year" | "mileage" | "stock_number"
  >,
  options?: { includeMileage?: boolean }
): string {
  const parts: string[] = [];

  if (car.registration_number?.trim()) {
    parts.push(car.registration_number.trim());
  }

  const vinSuffix = formatVinSuffix(car.vin);
  if (vinSuffix) {
    parts.push(`VIN ${vinSuffix}`);
  }

  if (car.year) {
    parts.push(String(car.year));
  }

  if (options?.includeMileage && car.mileage != null && car.mileage > 0) {
    parts.push(`${car.mileage.toLocaleString()} km`);
  }

  if (parts.length === 0 && car.stock_number?.trim()) {
    parts.push(car.stock_number.trim());
  }

  return parts.join(" · ");
}

export function sortDetailingCarSelectorOptions(
  cars: DetailingCarSelectorOption[]
): DetailingCarSelectorOption[] {
  return [...cars].sort((left, right) => {
    const leftRank = STATUS_SORT_ORDER[left.status] ?? DEFAULT_STATUS_SORT;
    const rightRank = STATUS_SORT_ORDER[right.status] ?? DEFAULT_STATUS_SORT;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftLabel = formatDetailingCarPrimaryLabel(left);
    const rightLabel = formatDetailingCarPrimaryLabel(right);
    return leftLabel.localeCompare(rightLabel, undefined, { sensitivity: "base" });
  });
}

export function filterDetailingCarSelectorOptions(
  cars: DetailingCarSelectorOption[],
  query: string
): DetailingCarSelectorOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return cars;

  return cars.filter((car) => {
    const haystack = [
      car.brand,
      car.model,
      String(car.year),
      car.vin ?? "",
      car.registration_number ?? "",
      car.stock_number ?? "",
      String(car.id),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function applyDetailingCarToVehicleFields(
  car: DetailingCarSelectorOption
): {
  vehicleMakeModel: string;
  registrationNumber: string;
} {
  return {
    vehicleMakeModel: formatDetailingCarPrimaryLabel(car),
    registrationNumber: (car.registration_number ?? "").trim().toUpperCase(),
  };
}

export function mergeDetailingCarSelectorOptions(
  cars: DetailingCarSelectorOption[],
  linked?: DetailingCarSelectorOption | null
): DetailingCarSelectorOption[] {
  if (!linked) return sortDetailingCarSelectorOptions(cars);
  if (cars.some((car) => car.id === linked.id)) {
    return sortDetailingCarSelectorOptions(cars);
  }
  return sortDetailingCarSelectorOptions([linked, ...cars]);
}
