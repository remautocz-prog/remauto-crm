import {
  DETAILING_SERVICE_CATEGORIES,
  type DetailingServiceCategory,
} from "@/lib/constants/detailing";
import { getDetailingServiceName } from "@/lib/detailing/service-labels";
import type { AppLocale } from "@/i18n/config";
import type { DetailingService } from "@/lib/types/detailing";

export const DETAILING_SERVICE_SELECT =
  "id, category, name_cs, name_ru, description_cs, description_ru, base_price, max_price, price_type, unit, active, sort_order, created_at, updated_at";

const KNOWN_CATEGORIES = new Set<string>(DETAILING_SERVICE_CATEGORIES);

export function normalizeDetailingServiceCategory(
  category: unknown
): DetailingServiceCategory {
  if (typeof category === "string" && KNOWN_CATEGORIES.has(category)) {
    return category as DetailingServiceCategory;
  }
  return "other";
}

export function serviceMatchesSearch(
  service: Pick<DetailingService, "name_cs" | "name_ru">,
  query: string,
  locale: AppLocale
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    service.name_cs,
    service.name_ru,
    getDetailingServiceName(service, locale),
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return haystack.some((value) => value.includes(q));
}

export type DetailingServiceCategoryGroup = {
  category: DetailingServiceCategory;
  items: DetailingService[];
};

export function groupDetailingServicesByCategory(
  services: DetailingService[],
  options: {
    locale: AppLocale;
    search?: string;
    activeOnly?: boolean;
  }
): DetailingServiceCategoryGroup[] {
  const search = options.search ?? "";
  const activeOnly = options.activeOnly ?? true;

  const filtered = services.filter((service) => {
    if (activeOnly && !service.active) return false;
    return serviceMatchesSearch(service, search, options.locale);
  });

  const buckets = new Map<DetailingServiceCategory, DetailingService[]>(
    DETAILING_SERVICE_CATEGORIES.map((category) => [category, []])
  );

  for (const service of filtered) {
    const category = normalizeDetailingServiceCategory(service.category);
    buckets.get(category)!.push(service);
  }

  return DETAILING_SERVICE_CATEGORIES.map((category) => ({
    category,
    items: buckets.get(category) ?? [],
  })).filter((group) => group.items.length > 0);
}
