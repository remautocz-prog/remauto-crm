export const FUEL_TYPE_VALUES = [
  "petrol",
  "diesel",
  "electric",
  "hybrid",
  "plug_in_hybrid",
  "lpg",
  "cng",
  "other",
] as const;

export type FuelType = (typeof FUEL_TYPE_VALUES)[number];
