export const HANDOVER_VEHICLE_SIDES = ["vehicle_a", "vehicle_b"] as const;

export type HandoverVehicleSide = (typeof HANDOVER_VEHICLE_SIDES)[number];

export const HANDOVER_DOCUMENT_VALUES = [
  "orv",
  "tp",
  "coc",
  "service_book",
  "user_manuals",
  "insurance_document",
  "other",
] as const;

export type HandoverDocumentValue = (typeof HANDOVER_DOCUMENT_VALUES)[number];

export const HANDOVER_FUEL_LEVEL_VALUES = [
  "empty",
  "reserve",
  "quarter",
  "half",
  "three_quarters",
  "full",
  "custom",
] as const;

export type HandoverFuelLevel = (typeof HANDOVER_FUEL_LEVEL_VALUES)[number];
