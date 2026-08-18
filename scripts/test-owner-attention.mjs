import assert from "node:assert/strict";

// Mirrors lib/dashboard/owner-attention.ts receivable rules.

function calculateRemainingAmount(finalPrice, paidAmount) {
  return Math.max(finalPrice - Math.max(paidAmount, 0), 0);
}

function isDetailingReceivableOrder(order) {
  if (order.archived_at) return false;
  if (order.status === "cancelled") return false;
  if (order.final_price <= 0) return false;
  return calculateRemainingAmount(order.final_price, order.paid_amount) > 0;
}

function isDetailingPartiallyPaidReceivable(order) {
  if (!isDetailingReceivableOrder(order)) return false;
  return order.paid_amount > 0;
}

function buildRows(input) {
  const today = input.today;
  const items = [];

  for (const task of input.tasks) {
    if (task.archived_at) continue;
    if (["COMPLETED", "DELIVERED", "CANCELLED"].includes(task.status)) continue;
    const due = task.due_date ?? task.deadline;
    if (!due) continue;

    if (due < today) {
      items.push({
        id: `documents:${task.id}:document_overdue`,
        module: "documents",
        entityId: String(task.id),
        reasonCategory: "document_overdue",
        priority: "critical",
        sortTimestamp: due,
      });
      continue;
    }

    if (due === today) {
      items.push({
        id: `documents:${task.id}:document_due_today`,
        module: "documents",
        entityId: String(task.id),
        reasonCategory: "document_due_today",
        priority: "high",
        sortTimestamp: due,
      });
    }
  }

  for (const order of input.detailingOrders) {
    if (order.archived_at || order.status === "cancelled") continue;

    if (isDetailingReceivableOrder(order)) {
      const partiallyPaid = isDetailingPartiallyPaidReceivable(order);
      items.push({
        id: `detailing:${order.id}:${partiallyPaid ? "detailing_partially_paid" : "detailing_unpaid"}`,
        module: "detailing",
        entityId: order.id,
        reasonCategory: partiallyPaid ? "detailing_partially_paid" : "detailing_unpaid",
        priority: partiallyPaid ? "high" : "critical",
        sortTimestamp: order.updated_at,
      });
      continue;
    }
  }

  for (const car of input.cars) {
    if (car.status === "sold" && !(Number(car.actual_sale_price) > 0)) {
      items.push({
        id: `cars:${car.id}:car_sold_missing_actual_price`,
        module: "cars",
        entityId: String(car.id),
        reasonCategory: "car_sold_missing_actual_price",
        priority: "critical",
        sortTimestamp: car.sale_date ?? car.updated_at,
      });
    }
  }

  const map = new Map();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

const today = "2026-08-07";

check(
  "old overdue document remains visible",
  buildRows({
    today,
    tasks: [{ id: 1, status: "IN_PROGRESS", due_date: "2026-06-01", archived_at: null }],
    detailingOrders: [],
    cars: [],
  }).some((item) => item.reasonCategory === "document_overdue")
);

check(
  "in_progress unpaid detailing appears",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o1",
        status: "in_progress",
        final_price: 20_000,
        paid_amount: 0,
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).some((item) => item.reasonCategory === "detailing_unpaid")
);

check(
  "unpaid delivered detailing appears",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o1",
        status: "delivered",
        final_price: 20_000,
        paid_amount: 0,
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).some((item) => item.reasonCategory === "detailing_unpaid")
);

check(
  "partially paid order appears once",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o2",
        status: "ready",
        final_price: 20_000,
        paid_amount: 5_000,
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).filter((item) => item.entityId === "o2").length === 1
);

check(
  "partially paid order uses partially paid reason",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o2",
        status: "ready",
        final_price: 20_000,
        paid_amount: 5_000,
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).some((item) => item.reasonCategory === "detailing_partially_paid")
);

check(
  "fully paid order does not appear",
  !buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o3",
        status: "delivered",
        final_price: 20_000,
        paid_amount: 20_000,
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).some((item) => item.module === "detailing")
);

check(
  "sold car missing actual sale price appears",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [],
    cars: [{ id: 3, status: "sold", actual_sale_price: null, updated_at: "2026-08-01" }],
  }).some((item) => item.reasonCategory === "car_sold_missing_actual_price")
);

check(
  "deduplicated document attention key",
  buildRows({
    today,
    tasks: [{ id: 4, status: "IN_PROGRESS", due_date: "2026-06-01", archived_at: null, priority: "high" }],
    detailingOrders: [],
    cars: [],
  }).filter((item) => item.entityId === "4").length === 1
);

console.log(`owner attention checks: ${passed} assertions passed`);
