import type { DealWithRelations } from "@/lib/types/deals";
import type { DealActivityItem } from "@/lib/types/deals";

type ActivityLabels = {
  dealCreated: string;
  dealUpdated: string;
  dealPrepared: string;
  dealSigned: string;
  dealInProgress: string;
  dealCompleted: string;
  dealCancelled: (reason: string) => string;
  dealArchived: string;
  paymentChanged: (status: string) => string;
  snapshotRefreshed: string;
};

export function buildDealActivityTimeline(input: {
  deal: DealWithRelations;
  labels: ActivityLabels;
}): DealActivityItem[] {
  const items: DealActivityItem[] = [];
  const href = `/deals/${input.deal.id}`;

  items.push({
    id: `${input.deal.id}-created`,
    kind: "deal_created",
    title: input.labels.dealCreated,
    subtitle: input.deal.deal_number,
    occurredAt: input.deal.created_at,
    href,
  });

  if (input.deal.updated_at !== input.deal.created_at) {
    items.push({
      id: `${input.deal.id}-updated`,
      kind: "deal_updated",
      title: input.labels.dealUpdated,
      occurredAt: input.deal.updated_at,
      href,
    });
  }

  if (input.deal.signed_at) {
    items.push({
      id: `${input.deal.id}-signed`,
      kind: "deal_status_changed",
      title: input.labels.dealSigned,
      occurredAt: input.deal.signed_at,
      href,
    });
  }

  if (input.deal.status === "completed") {
    items.push({
      id: `${input.deal.id}-completed`,
      kind: "deal_status_changed",
      title: input.labels.dealCompleted,
      occurredAt: input.deal.updated_at,
      href,
    });
  }

  if (input.deal.status === "cancelled" && input.deal.cancelled_reason) {
    items.push({
      id: `${input.deal.id}-cancelled`,
      kind: "deal_cancelled",
      title: input.labels.dealCancelled(input.deal.cancelled_reason),
      occurredAt: input.deal.updated_at,
      href,
    });
  }

  if (input.deal.archived_at) {
    items.push({
      id: `${input.deal.id}-archived`,
      kind: "deal_archived",
      title: input.labels.dealArchived,
      occurredAt: input.deal.archived_at,
      href,
    });
  }

  if (input.deal.payment_paid_at) {
    items.push({
      id: `${input.deal.id}-payment`,
      kind: "deal_payment_changed",
      title: input.labels.paymentChanged(input.deal.payment_status),
      occurredAt: input.deal.payment_paid_at,
      href,
    });
  }

  return items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export function buildClientDealActivityItems(deals: DealWithRelations[]): DealActivityItem[] {
  return deals.flatMap((deal) =>
    buildDealActivityTimeline({
      deal,
      labels: {
        dealCreated: deal.deal_number,
        dealUpdated: deal.deal_number,
        dealPrepared: deal.deal_number,
        dealSigned: deal.deal_number,
        dealInProgress: deal.deal_number,
        dealCompleted: deal.deal_number,
        dealCancelled: () => deal.deal_number,
        dealArchived: deal.deal_number,
        paymentChanged: () => deal.deal_number,
        snapshotRefreshed: deal.deal_number,
      },
    })
  );
}
