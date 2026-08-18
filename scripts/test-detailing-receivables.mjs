import assert from "node:assert/strict";

// Mirrors lib/detailing/receivables.ts

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateRemainingAmount(finalPrice, paidAmount) {
  return roundMoney(Math.max(finalPrice - Math.max(paidAmount, 0), 0));
}

function getDetailingOutstandingBalance(order) {
  return calculateRemainingAmount(order.final_price, order.paid_amount);
}

function isDetailingReceivableOrder(order) {
  if (order.archived_at) return false;
  if (order.status === "cancelled") return false;
  if (order.final_price <= 0) return false;
  return getDetailingOutstandingBalance(order) > 0;
}

function isDetailingPartiallyPaidReceivable(order) {
  if (!isDetailingReceivableOrder(order)) return false;
  return order.paid_amount > 0;
}

function summarizeDetailingReceivables(orders) {
  let unpaidOrderCount = 0;
  let outstandingAmount = 0;

  for (const order of orders) {
    if (!isDetailingReceivableOrder(order)) continue;
    unpaidOrderCount += 1;
    outstandingAmount += getDetailingOutstandingBalance(order);
  }

  return {
    unpaidOrderCount,
    outstandingAmount: roundMoney(outstandingAmount),
  };
}

function order(overrides) {
  return {
    id: "o1",
    status: "in_progress",
    final_price: 20_000,
    paid_amount: 0,
    archived_at: null,
    ...overrides,
  };
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

check(
  "in_progress + 0 paid is included",
  isDetailingReceivableOrder(order({ status: "in_progress", paid_amount: 0 }))
);
check(
  "in_progress + partially paid is included",
  isDetailingReceivableOrder(order({ status: "in_progress", paid_amount: 5_000 }))
);
check(
  "ready + unpaid is included",
  isDetailingReceivableOrder(order({ status: "ready", paid_amount: 0 }))
);
check(
  "delivered + unpaid is included",
  isDetailingReceivableOrder(order({ status: "delivered", paid_amount: 0 }))
);
check(
  "delivered + partially paid is included",
  isDetailingReceivableOrder(order({ status: "delivered", paid_amount: 5_000 }))
);
check(
  "fully paid is excluded",
  !isDetailingReceivableOrder(order({ status: "delivered", paid_amount: 20_000 }))
);
check(
  "archived unpaid is excluded",
  !isDetailingReceivableOrder(
    order({ status: "in_progress", archived_at: "2026-08-01T00:00:00.000Z" })
  )
);
check(
  "cancelled unpaid is excluded",
  !isDetailingReceivableOrder(order({ status: "cancelled", paid_amount: 0 }))
);

const summary = summarizeDetailingReceivables([
  order({ id: "a", status: "in_progress", paid_amount: 0 }),
  order({ id: "b", status: "ready", paid_amount: 5_000 }),
  order({ id: "c", status: "delivered", paid_amount: 20_000 }),
  order({ id: "d", status: "cancelled", paid_amount: 0 }),
]);

check("summary counts receivable orders", summary.unpaidOrderCount === 2);
check(
  "summary sums outstanding CZK",
  summary.outstandingAmount === roundMoney(20_000 + 15_000)
);
check(
  "partially paid helper",
  isDetailingPartiallyPaidReceivable(order({ paid_amount: 5_000 }))
);
check(
  "unpaid helper is not partially paid",
  !isDetailingPartiallyPaidReceivable(order({ paid_amount: 0 }))
);

console.log(`detailing receivables checks: ${passed} assertions passed`);
