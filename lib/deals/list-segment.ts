export const DEAL_LIST_SEGMENTS = ["active", "archived"] as const;

export type DealListSegment = (typeof DEAL_LIST_SEGMENTS)[number];

export function parseDealListSegment(input?: {
  segment?: string | null;
  archived?: boolean | string | null;
}): DealListSegment {
  const raw = input?.segment?.trim().toLowerCase();
  if (raw === "active" || raw === "archived") {
    return raw;
  }
  if (input?.archived === true || input?.archived === "1" || input?.archived === "true") {
    return "archived";
  }
  return "active";
}
