export const DETAILING_LIST_SEGMENTS = ["active", "archived"] as const;

export type DetailingListSegment = (typeof DETAILING_LIST_SEGMENTS)[number];

export function parseDetailingListSegment(input?: string | null): DetailingListSegment {
  const raw = input?.trim().toLowerCase();
  return raw === "archived" ? "archived" : "active";
}

export function isDetailingOrderArchived(archivedAt: string | null | undefined): boolean {
  return Boolean(archivedAt);
}
