import type { CarStatusValue } from "@/lib/constants/cars";

export const CAR_STATUS_STYLES: Record<CarStatusValue, string> = {
  in_stock: "border-green-600/30 bg-green-600/10 text-green-400",
  sold: "border-red-600/40 bg-red-600/10 text-red-400",
  reserved: "border-yellow-600/30 bg-yellow-600/10 text-yellow-300",
  in_transit: "border-blue-600/30 bg-blue-600/10 text-blue-300",
};
