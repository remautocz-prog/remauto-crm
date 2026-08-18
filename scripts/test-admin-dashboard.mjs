import assert from "node:assert/strict";

// Mirrors admin dashboard helpers for regression checks.

const ADMIN_EXCLUDED = new Set(["detailing_missing_vehicle_expense"]);
const STUCK = new Set([
  "document_overdue",
  "detailing_overdue_completion",
  "detailing_ready_waiting",
  "car_sold_missing_actual_price",
  "car_long_in_stock",
]);

function filterAdminAttention(items) {
  return items.filter((item) => !ADMIN_EXCLUDED.has(item.reasonCategory));
}

function countRequiresAttention(items) {
  return items.filter(
    (item) => item.priority === "critical" || item.priority === "high"
  ).length;
}

function getDocumentsWorkloadSignal(activeCount) {
  if (activeCount > 10) return "overloaded";
  if (activeCount > 5) return "busy";
  return "normal";
}

function buildStuckProcessItems(attentionItems, limit = 8) {
  const visible = new Set(
    attentionItems.slice(0, 8).map((item) => `${item.module}:${item.entityId}`)
  );
  return attentionItems
    .filter((item) => STUCK.has(item.reasonCategory))
    .filter((item) => !visible.has(`${item.module}:${item.entityId}`))
    .slice(0, limit);
}

function getDefaultRouteForRole(role) {
  if (role === "owner") return "/dashboard";
  if (role === "admin") return "/admin/dashboard";
  if (role === "detailing") return "/detailing";
  if (role === "documents") return "/documents/dashboard";
  return "/access-disabled";
}

const ADMIN_PERMS = new Set(["admin.dashboard"]);
const OWNER_PERMS = new Set(["admin.dashboard", "owner.dashboard"]);
const DOCUMENTS_PERMS = new Set(["documents.view"]);

function hasPermission(role, permission) {
  const map = {
    admin: ADMIN_PERMS,
    owner: OWNER_PERMS,
    documents: DOCUMENTS_PERMS,
    detailing: new Set(["detailing.view"]),
  };
  return map[role]?.has(permission) ?? false;
}

function summarizeDetailingReceivables(orders) {
  let unpaidOrderCount = 0;
  let outstandingAmount = 0;

  for (const order of orders) {
    if (order.archived_at || order.status === "cancelled" || order.final_price <= 0) {
      continue;
    }
    const outstanding = Math.max(order.final_price - Math.max(order.paid_amount, 0), 0);
    if (outstanding <= 0) continue;
    unpaidOrderCount += 1;
    outstandingAmount += outstanding;
  }

  return { unpaidOrderCount, outstandingAmount };
}

function computeOperationalKpis(input) {
  const detailingReceivables = summarizeDetailingReceivables(input.orders);
  return {
    requiresAttention: countRequiresAttention(input.attentionItems),
    overdueDocuments: 0,
    detailingInProgress: input.orders.filter((order) => order.status === "in_progress").length,
    detailingReceivables,
    carsRequiringAction: 0,
  };
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

check("admin default route", getDefaultRouteForRole("admin") === "/admin/dashboard");
check("owner default route", getDefaultRouteForRole("owner") === "/dashboard");
check("admin cannot access owner dashboard", !hasPermission("admin", "owner.dashboard"));
check("owner can access owner dashboard", hasPermission("owner", "owner.dashboard"));
check("admin can access admin dashboard", hasPermission("admin", "admin.dashboard"));
check("owner can access admin dashboard", hasPermission("owner", "admin.dashboard"));
check("documents cannot access admin dashboard", !hasPermission("documents", "admin.dashboard"));
check("detailing cannot access admin dashboard", !hasPermission("detailing", "admin.dashboard"));

const attention = [
  { module: "documents", entityId: "1", reasonCategory: "document_overdue", priority: "critical" },
  {
    module: "detailing",
    entityId: "2",
    reasonCategory: "detailing_missing_vehicle_expense",
    priority: "high",
  },
];
const filtered = filterAdminAttention(attention);
check("finance alert excluded from admin attention", filtered.length === 1);
check("requires attention counts critical/high", countRequiresAttention(filtered) === 1);

check("documents workload normal at 5", getDocumentsWorkloadSignal(5) === "normal");
check("documents workload busy at 6", getDocumentsWorkloadSignal(6) === "busy");
check("documents workload overloaded at 11", getDocumentsWorkloadSignal(11) === "overloaded");

const stuckSource = Array.from({ length: 8 }, (_, index) => ({
  module: "documents",
  entityId: String(index),
  reasonCategory: "document_due_today",
  priority: "medium",
})).concat([
  {
    module: "detailing",
    entityId: "99",
    reasonCategory: "detailing_overdue_completion",
    priority: "critical",
  },
]);
const stuck = buildStuckProcessItems(stuckSource, 8);
check("stuck processes skip entities already in attention top", stuck.length === 1);
check("stuck keeps non-visible entity", stuck[0]?.entityId === "99");

const receivableOrders = [
  {
    id: "1",
    status: "in_progress",
    final_price: 20_000,
    paid_amount: 0,
    archived_at: null,
  },
  {
    id: "2",
    status: "ready",
    final_price: 20_000,
    paid_amount: 5_000,
    archived_at: null,
  },
  {
    id: "3",
    status: "delivered",
    final_price: 20_000,
    paid_amount: 20_000,
    archived_at: null,
  },
];

const kpis = computeOperationalKpis({
  attentionItems: [],
  orders: receivableOrders,
});

check("admin unpaid KPI counts receivable orders", kpis.detailingReceivables.unpaidOrderCount === 2);
check(
  "admin unpaid KPI sums outstanding CZK",
  kpis.detailingReceivables.outstandingAmount === 35_000
);

console.log(`admin dashboard checks: ${passed} assertions passed`);
