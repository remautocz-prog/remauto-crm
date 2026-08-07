import assert from "node:assert/strict";

const COMPLETED = ["COMPLETED", "DELIVERED"];
const bounds = { start: "2026-03-01", end: "2026-03-31" };

function isWithinPeriod(date, { start, end }) {
  return date >= start && date <= end;
}

function isRecognized(task) {
  if (task.archived_at) return false;
  if (!COMPLETED.includes(task.status)) return false;
  const completedAt = task.completed_at?.slice(0, 10);
  if (!completedAt || !isWithinPeriod(completedAt, bounds)) return false;
  const servicePrice = Number(task.service_price ?? 0);
  const costPrice = Number(task.cost_price ?? 0);
  return servicePrice > 0 || costPrice > 0 || Boolean(task.services?.length);
}

function summarize(tasks) {
  let revenue = 0;
  let expenses = 0;
  let paidRevenue = 0;
  let completedCount = 0;

  for (const task of tasks) {
    if (!isRecognized(task)) continue;
    const servicePrice = Number(task.service_price ?? 0);
    const costPrice = Number(task.cost_price ?? 0);
    const paidAmount = Number(task.paid_amount ?? 0);
    revenue += servicePrice;
    expenses += costPrice;
    paidRevenue += Math.min(paidAmount, servicePrice);
    completedCount += 1;
  }

  const profit = revenue - expenses;
  return {
    revenue,
    expenses,
    profit,
    paidRevenue,
    unpaidRevenue: Math.max(revenue - paidRevenue, 0),
    completedCount,
    averageOrderValue: completedCount > 0 ? revenue / completedCount : 0,
  };
}

function task(overrides) {
  return {
    id: 1,
    status: "COMPLETED",
    archived_at: null,
    completed_at: "2026-03-15",
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

check("completed paid task recognized", isRecognized(task({})));
check(
  "completed unpaid task recognized",
  isRecognized(task({ paid_amount: 0, payment_status: "unpaid" }))
);
check(
  "open task excluded",
  !isRecognized(task({ status: "IN_PROGRESS", completed_at: null }))
);
check(
  "archived task excluded",
  !isRecognized(task({ archived_at: "2026-03-20T12:00:00.000Z" }))
);
check(
  "cancelled task excluded",
  !isRecognized(task({ status: "CANCELLED" }))
);
check(
  "outside range excluded",
  !isRecognized(task({ completed_at: "2026-02-28" }))
);

const summary = summarize([
  task({ id: 1, service_price: 10000, cost_price: 3000, paid_amount: 10000 }),
  task({
    id: 2,
    service_price: 8000,
    cost_price: 2000,
    paid_amount: 0,
    payment_status: "unpaid",
  }),
  task({ id: 3, status: "IN_PROGRESS", completed_at: null }),
  task({ id: 4, status: "CANCELLED", completed_at: "2026-03-10" }),
  task({
    id: 5,
    completed_at: "2026-01-10",
    service_price: 5000,
    cost_price: 1000,
  }),
]);

check("revenue sums recognized tasks", summary.revenue === 18000);
check("expenses sums recognized tasks", summary.expenses === 5000);
check("profit is revenue minus expenses", summary.profit === 13000);
check("paid revenue tracked separately", summary.paidRevenue === 10000);
check("unpaid revenue is receivables", summary.unpaidRevenue === 8000);
check("completed count", summary.completedCount === 2);
check("average order value", summary.averageOrderValue === 9000);

console.log(`Documents finance checks passed (${passed} assertions).`);
