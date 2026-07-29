const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{11,17}$/i;

export function normalizeVin(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export function isSuspiciousVin(value: string | null | undefined) {
  const vin = normalizeVin(value);
  if (!vin) return false;
  return !VIN_PATTERN.test(vin);
}

export function validateVinWarning(value: string | null | undefined) {
  const vin = normalizeVin(value);
  if (!vin) return null;
  if (isSuspiciousVin(vin)) {
    return "suspiciousVin";
  }
  return null;
}
