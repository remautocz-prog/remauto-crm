import type { AppLocale } from "@/i18n/config";
import type { DetailingService } from "@/lib/types/detailing";

export const DETAILING_SERVICE_NAME_FALLBACK = "Service";

export function getDetailingServiceName(
  service: Pick<DetailingService, "name_cs" | "name_ru">,
  locale: AppLocale
): string {
  const nameCs = service.name_cs?.trim() ?? "";
  const nameRu = service.name_ru?.trim() ?? "";

  if (locale === "ru") {
    return nameRu || nameCs || DETAILING_SERVICE_NAME_FALLBACK;
  }
  if (locale === "cs") {
    return nameCs || nameRu || DETAILING_SERVICE_NAME_FALLBACK;
  }
  return nameCs || nameRu || DETAILING_SERVICE_NAME_FALLBACK;
}

export function formatDetailingServicePrice(
  service: Pick<
    DetailingService,
    "base_price" | "max_price" | "price_type" | "unit"
  >,
  formatCurrency: (value: number) => string,
  labels: {
    from: string;
    range: string;
    perItem: string;
    onRequest: string;
    custom: string;
  }
): string {
  switch (service.price_type) {
    case "on_request":
      return labels.onRequest;
    case "custom":
      return labels.custom;
    case "from":
      return service.base_price != null
        ? `${labels.from} ${formatCurrency(service.base_price)}`
        : labels.onRequest;
    case "range":
      if (service.base_price != null && service.max_price != null) {
        return `${formatCurrency(service.base_price)} – ${formatCurrency(service.max_price)}`;
      }
      return service.base_price != null
        ? formatCurrency(service.base_price)
        : labels.onRequest;
    case "per_item":
      if (service.base_price != null) {
        const unit = service.unit ? ` / ${service.unit}` : "";
        return `${formatCurrency(service.base_price)}${unit}`;
      }
      return labels.onRequest;
    case "fixed":
    default:
      return service.base_price != null
        ? formatCurrency(service.base_price)
        : labels.onRequest;
  }
}
