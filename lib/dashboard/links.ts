export function getDocumentsFilterHref(filter: {
  overdue?: boolean;
  dueToday?: boolean;
  priority?: string;
  unassignedOnly?: boolean;
  paymentOutstanding?: boolean;
  assignedTo?: string | null;
}) {
  const params = new URLSearchParams();

  if (filter.overdue) {
    params.set("deadline", "overdue");
  }
  if (filter.dueToday) {
    params.set("deadline", "today");
  }
  if (filter.priority) {
    params.set("priority", filter.priority);
  }
  if (filter.unassignedOnly) {
    params.set("assignment", "unassigned");
  }
  if (filter.paymentOutstanding) {
    params.set("payment", "unpaid");
  }
  if (filter.assignedTo) {
    params.set("assigned_to", filter.assignedTo);
  }

  const query = params.toString();
  return query ? `/documents?${query}` : "/documents";
}

export function getDealsFilterHref(filter: {
  active?: boolean;
  unsignedPrepared?: boolean;
  awaitingPayment?: boolean;
  overdue?: boolean;
  handoversToday?: boolean;
  completedMonth?: boolean;
}) {
  const params = new URLSearchParams();
  if (filter.active) params.set("filter", "active");
  if (filter.unsignedPrepared) params.set("filter", "unsigned_prepared");
  if (filter.awaitingPayment) params.set("filter", "awaiting_payment");
  if (filter.overdue) params.set("filter", "overdue");
  if (filter.handoversToday) params.set("filter", "handovers_today");
  if (filter.completedMonth) params.set("filter", "completed_month");
  const query = params.toString();
  return query ? `/deals?${query}` : "/deals";
}

export const DASHBOARD_QUICK_ACTION_LINKS = {
  newCar: "/cars/new",
  newClient: "/clients",
  newDocumentOrder: "/documents",
  newDetailingOrder: "/detailing/orders/new",
  viewOverdueOrders: getDocumentsFilterHref({ overdue: true }),
} as const;
