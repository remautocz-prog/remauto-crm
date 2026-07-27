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

export const DASHBOARD_QUICK_ACTION_LINKS = {
  newCar: "/cars/new",
  newClient: "/clients",
  newDocumentOrder: "/documents",
  viewOverdueOrders: getDocumentsFilterHref({ overdue: true }),
} as const;
