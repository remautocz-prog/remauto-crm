import type {
  OwnerAttentionReasonCategory,
  OwnerAttentionRow,
} from "@/lib/dashboard/owner-attention";

const STUCK_REASON_CATEGORIES = new Set<OwnerAttentionReasonCategory>([
  "document_overdue",
  "detailing_overdue_completion",
  "detailing_ready_waiting",
  "car_sold_missing_actual_price",
  "car_long_in_stock",
]);

/** Top stuck operational items — same rows/priority as attention engine. */
export function buildStuckProcessItems(
  attentionItems: OwnerAttentionRow[],
  limit = 8
): OwnerAttentionRow[] {
  const visibleAttentionEntities = new Set(
    attentionItems.slice(0, 8).map((item) => `${item.module}:${item.entityId}`)
  );

  return attentionItems
    .filter((item) => STUCK_REASON_CATEGORIES.has(item.reasonCategory))
    .filter(
      (item) => !visibleAttentionEntities.has(`${item.module}:${item.entityId}`)
    )
    .slice(0, limit);
}
