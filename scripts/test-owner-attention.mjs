import assert from "node:assert/strict";

// Mirrors lib/dashboard/owner-attention.ts rules for regression checks.

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
    if (order.status === "delivered" && order.payment_status === "unpaid") {
      items.push({
        id: `detailing:${order.id}:detailing_unpaid`,
        module: "detailing",
        entityId: order.id,
        reasonCategory: "detailing_unpaid",
        priority: "critical",
        sortTimestamp: order.updated_at,
      });
    }
    if (order.status === "delivered" && order.payment_status === "partially_paid") {
      items.push({
        id: `detailing:${order.id}:detailing_partially_paid`,
        module: "detailing",
        entityId: order.id,
        reasonCategory: "detailing_partially_paid",
        priority: "high",
        sortTimestamp: order.updated_at,
      });
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
  "unpaid delivered detailing appears",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o1",
        status: "delivered",
        payment_status: "unpaid",
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).some((item) => item.reasonCategory === "detailing_unpaid")
);

check(
  "partially paid order appears",
  buildRows({
    today,
    tasks: [],
    detailingOrders: [
      {
        id: "o2",
        status: "delivered",
        payment_status: "partially_paid",
        archived_at: null,
        updated_at: "2026-08-01",
      },
    ],
    cars: [],
  }).some((item) => item.reasonCategory === "detailing_partially_paid")
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
