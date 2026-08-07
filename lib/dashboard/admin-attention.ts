import type { OwnerAttentionRow } from "@/lib/dashboard/owner-attention";
import { summarizeOwnerAttention } from "@/lib/dashboard/owner-attention";
import type { OwnerAttentionLoadResult } from "@/lib/queries/owner-attention";

const ADMIN_EXCLUDED_ATTENTION_CATEGORIES = new Set([
  "detailing_missing_vehicle_expense",
]);

/** Operational attention for admin dashboard — reuses owner engine output. */
export function buildAdminAttentionResult(
  attention: OwnerAttentionLoadResult
): OwnerAttentionLoadResult {
  const items = attention.items.filter(
    (item) => !ADMIN_EXCLUDED_ATTENTION_CATEGORIES.has(item.reasonCategory)
  );

  return {
    items,
    summary: summarizeOwnerAttention(items),
    errors: attention.errors,
  };
}

export function countAdminRequiresAttention(items: OwnerAttentionRow[]) {
  return items.filter(
    (item) => item.priority === "critical" || item.priority === "high"
  ).length;
}
