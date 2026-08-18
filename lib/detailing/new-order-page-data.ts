import type { DetailingCarSelectorOption } from "@/lib/detailing/car-selector";
import { safeDetailingQuery, type DetailingQueryWarning } from "@/lib/detailing/query-utils";
import type { DetailingEmployeeWithProfile, DetailingService } from "@/lib/types/detailing";
import { getDetailingCarSelectorOptions } from "@/lib/queries/detailing-car-selector";
import { getDetailingEmployees, getDetailingServices } from "@/lib/queries/detailing";

export type NewDetailingOrderPageData = {
  services: DetailingService[];
  employees: DetailingEmployeeWithProfile[];
  cars: DetailingCarSelectorOption[];
  warnings: DetailingQueryWarning[];
};

export async function loadNewDetailingOrderPageData(input?: {
  linkedCarId?: number | null;
}): Promise<NewDetailingOrderPageData> {
  const warnings: DetailingQueryWarning[] = [];

  const [services, employees, cars] = await Promise.all([
    safeDetailingQuery("getDetailingServices", getDetailingServices, [], warnings),
    safeDetailingQuery("getDetailingEmployees", getDetailingEmployees, [], warnings),
    safeDetailingQuery(
      "getDetailingCarSelectorOptions",
      () => getDetailingCarSelectorOptions({ linkedCarId: input?.linkedCarId ?? null }),
      [],
      warnings
    ),
  ]);

  return { services, employees, cars, warnings };
}
