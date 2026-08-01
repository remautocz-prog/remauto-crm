import { safeDetailingQuery, type DetailingQueryWarning } from "@/lib/detailing/query-utils";
import type { DetailingEmployeeWithProfile, DetailingService } from "@/lib/types/detailing";
import { getDetailingEmployees, getDetailingServices } from "@/lib/queries/detailing";

export type NewDetailingOrderPageData = {
  services: DetailingService[];
  employees: DetailingEmployeeWithProfile[];
  warnings: DetailingQueryWarning[];
};

export async function loadNewDetailingOrderPageData(): Promise<NewDetailingOrderPageData> {
  const warnings: DetailingQueryWarning[] = [];

  const [services, employees] = await Promise.all([
    safeDetailingQuery("getDetailingServices", getDetailingServices, [], warnings),
    safeDetailingQuery("getDetailingEmployees", getDetailingEmployees, [], warnings),
  ]);

  return { services, employees, warnings };
}
