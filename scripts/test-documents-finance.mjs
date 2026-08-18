import assert from "node:assert/strict";

const FINAL = ["COMPLETED", "DELIVERED"];
const bounds = { start: "2026-03-01", end: "2026-03-31" };

function isWithinPeriod(date, { start, end }) {
  return date >= start && date <= end;
}

function derivePaymentStatus(paidAmount, servicePrice) {
  const paid = Number(paidAmount ?? 0);
  const price = Number(servicePrice ?? 0);
  if (paid <= 0) return "unpaid";
  if (price > 0 && paid < price) return "partially_paid";
  if (price > 0 && paid >= price) return "paid";
  return paid > 0 ? "partially_paid" : "unpaid";
}

function resolvePricing(task) {
  if (task.services?.length) {
    const servicePrice = task.services.reduce(
      (sum, row) => sum + Number(row.service_price ?? 0),
      0
    );
    const costPrice = task.services.reduce(
      (sum, row) => sum + Number(row.cost_price ?? 0),
      0
    );
    return { servicePrice, costPrice, usesServiceRows: true };
  }
  return {
    servicePrice: Number(task.service_price ?? 0),
    costPrice: Number(task.cost_price ?? 0),
    usesServiceRows: false,
  };
}

function getFinance(task) {
  const pricing = resolvePricing(task);
  const paidAmount = Number(task.paid_amount ?? 0);
  return {
    ...pricing,
    paidAmount,
    paymentStatus: derivePaymentStatus(paidAmount, pricing.servicePrice),
    outstandingBalance: Math.max(pricing.servicePrice - paidAmount, 0),
  };
}

function getRecognitionDate(task) {
  if (task.completed_at) return task.completed_at.slice(0, 10);
  if (task.delivered_at) return task.delivered_at.slice(0, 10);
  if (task.ready_at) return task.ready_at.slice(0, 10);
  if (FINAL.includes(task.status)) return task.updated_at.slice(0, 10);
  return null;
}

function isRecognized(task) {
  if (task.archived_at) return false;
  if (task.status === "CANCELLED") return false;
  if (!FINAL.includes(task.status)) return false;

  const finance = getFinance(task);
  if (finance.paymentStatus !== "paid") return false;
  if (
    !(finance.servicePrice > 0 || finance.costPrice > 0 || finance.usesServiceRows)
  ) {
    return false;
  }

  const recognitionDate = getRecognitionDate(task);
  return Boolean(recognitionDate && isWithinPeriod(recognitionDate, bounds));
}

function isFinalReceivable(task) {
  if (task.archived_at) return false;
  if (task.status === "CANCELLED") return false;
  if (!FINAL.includes(task.status)) return false;

  const finance = getFinance(task);
  if (finance.paymentStatus === "paid") return false;
  if (
    !(finance.servicePrice > 0 || finance.costPrice > 0 || finance.usesServiceRows)
  ) {
    return false;
  }

  const recognitionDate = getRecognitionDate(task);
  if (!recognitionDate || !isWithinPeriod(recognitionDate, bounds)) return false;
  return finance.outstandingBalance > 0;
}

function summarize(tasks) {
  let revenue = 0;
  let expenses = 0;
  let paidRevenue = 0;
  let unpaidRevenue = 0;
  let completedCount = 0;

  for (const task of tasks) {
    if (isRecognized(task)) {
      const finance = getFinance(task);
      revenue += finance.servicePrice;
      expenses += finance.costPrice;
      paidRevenue += finance.servicePrice;
      completedCount += 1;
      continue;
    }

    if (isFinalReceivable(task)) {
      unpaidRevenue += getFinance(task).outstandingBalance;
    }
  }

  const profit = revenue - expenses;
  return {
    revenue,
    expenses,
    profit,
    paidRevenue,
    unpaidRevenue,
    completedCount,
    averageOrderValue: completedCount > 0 ? revenue / completedCount : 0,
  };
}

function task(overrides) {
  return {
    id: 1,
    status: "DELIVERED",
    archived_at: null,
    completed_at: null,
    delivered_at: "2026-03-15T10:00:00.000Z",
    ready_at: null,
    updated_at: "2026-03-15T12:00:00.000Z",
    service_price: 5000,
    cost_price: 1200,
    paid_amount: 5000,
    payment_status: "paid",
    services: undefined,
    ...overrides,
  };
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

check("1. final/issued + fully paid included", isRecognized(task({})));

check(
  "2. final/issued + unpaid excluded from profit",
  !isRecognized(task({ paid_amount: 0, payment_status: "unpaid" }))
);

check(
  "3. final/issued + partially paid excluded",
  !isRecognized(
    task({ paid_amount: 2000, payment_status: "partially_paid", service_price: 5000 })
  )
);

check(
  "4. completed + fully paid included",
  isRecognized(
    task({
      status: "COMPLETED",
      completed_at: "2026-03-12",
      delivered_at: null,
    })
  )
);

check(
  "5. open + fully paid excluded",
  !isRecognized(task({ status: "IN_PROGRESS", completed_at: null, delivered_at: null }))
);

check(
  "6. cancelled + fully paid excluded",
  !isRecognized(task({ status: "CANCELLED", completed_at: "2026-03-10" }))
);

check(
  "7. archived + fully paid excluded",
  !isRecognized(task({ archived_at: "2026-03-20T12:00:00.000Z" }))
);

check(
  "8. final + paid_amount >= price included even if payment_status stale",
  isRecognized(
    task({
      paid_amount: 5000,
      payment_status: "unpaid",
    })
  )
);

check(
  "9. final + payment_status paid but underpaid excluded",
  !isRecognized(
    task({
      paid_amount: 1000,
      payment_status: "paid",
      service_price: 5000,
    })
  )
);

check(
  "delivered without completed_at uses delivered_at",
  isRecognized(
    task({
      completed_at: null,
      delivered_at: "2026-03-18T09:00:00.000Z",
    })
  )
);

const summary = summarize([
  task({
    id: 1,
    service_price: 10000,
    cost_price: 3000,
    paid_amount: 10000,
    delivered_at: "2026-03-10T00:00:00.000Z",
  }),
  task({
    id: 2,
    service_price: 8000,
    cost_price: 2000,
    paid_amount: 0,
    payment_status: "unpaid",
    delivered_at: "2026-03-12T00:00:00.000Z",
  }),
  task({ id: 3, status: "IN_PROGRESS", completed_at: null, delivered_at: null }),
  task({
    id: 4,
    status: "CANCELLED",
    completed_at: "2026-03-10",
    delivered_at: "2026-03-10T00:00:00.000Z",
  }),
  task({
    id: 5,
    completed_at: "2026-01-10",
    delivered_at: "2026-01-10T00:00:00.000Z",
    service_price: 5000,
    cost_price: 1000,
    paid_amount: 5000,
  }),
  task({
    id: 6,
    service_price: 6000,
    cost_price: 500,
    paid_amount: 3000,
    payment_status: "partially_paid",
    delivered_at: "2026-03-20T00:00:00.000Z",
  }),
]);

check("revenue sums cash-completed tasks only", summary.revenue === 10000);
check("expenses sums recognized tasks only", summary.expenses === 3000);
check("profit is revenue minus expenses", summary.profit === 7000);
check("paid revenue equals recognized revenue", summary.paidRevenue === 10000);
check("unpaid revenue tracks final receivables", summary.unpaidRevenue === 11000);
check("completed count", summary.completedCount === 1);
check("average order value", summary.averageOrderValue === 10000);

console.log(`Documents finance checks passed (${passed} assertions).`);
