import type { CarStatusValue } from "@/lib/constants/cars";

/** Badge / pill styles for vehicle status controls. */
export const CAR_STATUS_STYLES: Record<CarStatusValue, string> = {
  in_stock: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  sold: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  reserved: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  in_transit: "border-sky-400/30 bg-sky-400/10 text-sky-200",
};
