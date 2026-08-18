import assert from "node:assert/strict";

const FINAL = ["COMPLETED", "DELIVERED"];

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

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

function getRecognitionDate(task) {
  if (task.completed_at) return task.completed_at.slice(0, 10);
  if (task.delivered_at) return task.delivered_at.slice(0, 10);
  if (task.ready_at) return task.ready_at.slice(0, 10);
  if (FINAL.includes(task.status)) return task.updated_at.slice(0, 10);
  return null;
}

function isRecognized(task, bounds) {
  if (task.archived_at) return false;
  if (task.status === "CANCELLED") return false;
  if (!FINAL.includes(task.status)) return false;
  if (derivePaymentStatus(task.paid_amount, task.service_price) !== "paid") {
    return false;
  }
  const recognitionDate = getRecognitionDate(task);
  if (!recognitionDate || !isWithinPeriod(recognitionDate, bounds)) return false;
  return Number(task.service_price ?? 0) > 0 || Number(task.cost_price ?? 0) > 0;
}

function documentsSummary(tasks, bounds) {
  let revenue = 0;
  let expenses = 0;
  let paidRevenue = 0;
  let unpaidRevenue = 0;
  let completedCount = 0;

  for (const task of tasks) {
    if (isRecognized(task, bounds)) {
      const servicePrice = Number(task.service_price ?? 0);
      const costPrice = Number(task.cost_price ?? 0);
      revenue += servicePrice;
      expenses += costPrice;
      paidRevenue += servicePrice;
      completedCount += 1;
      continue;
    }

    if (
      !task.archived_at &&
      FINAL.includes(task.status) &&
      derivePaymentStatus(task.paid_amount, task.service_price) !== "paid"
    ) {
      const recognitionDate = getRecognitionDate(task);
      if (recognitionDate && isWithinPeriod(recognitionDate, bounds)) {
        unpaidRevenue += Math.max(
          Number(task.service_price ?? 0) - Number(task.paid_amount ?? 0),
          0
        );
      }
    }
  }

  const profit = roundMoney(revenue - expenses);
  return {
    revenue: roundMoney(revenue),
    expenses: roundMoney(expenses),
    profit,
    paidRevenue: roundMoney(paidRevenue),
    unpaidRevenue: roundMoney(unpaidRevenue),
    completedCount,
  };
}

function detailingSummary(orders, expenseTotal) {
  const delivered = orders.filter((o) => o.status === "delivered");
  const revenue = roundMoney(delivered.reduce((s, o) => s + o.final_price, 0));
  const commissions = roundMoney(
    delivered.reduce((s, o) => s + (o.commission_total ?? 0), 0)
  );
  const expenses = roundMoney(expenseTotal);
  return {
    orderCount: delivered.length,
    revenue,
    commissions,
    expenses,
    netResult: roundMoney(revenue - commissions - expenses),
  };
}

function buildCards({ carsProfit, carsExpenses, soldCount, detailing, documents }) {
  return {
    cars: { profit: carsProfit, expenses: carsExpenses, soldCount },
    detailing,
    documents,
  };
}

function combinedResult(cards) {
  return roundMoney(
    cards.cars.profit + cards.detailing.netResult + cards.documents.profit
  );
}

function chartSummary(cards) {
  return [
    { id: "cars", profit: cards.cars.profit },
    { id: "detailing", profit: cards.detailing.netResult },
    { id: "documents", profit: cards.documents.profit },
  ];
}

const bounds = { start: "2026-03-01", end: "2026-03-31" };
let passed = 0;

function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

// Cars only
{
  const cards = buildCards({
    carsProfit: 120000,
    carsExpenses: 45000,
    soldCount: 2,
    detailing: detailingSummary([], 0),
    documents: documentsSummary([], bounds),
  });
  check("cars only combined", combinedResult(cards) === 120000);
  check("cars only chart has 3 bars", chartSummary(cards).length === 3);
}

// Detailing only
{
  const detailing = detailingSummary(
    [{ status: "delivered", final_price: 8000, commission_total: 1200 }],
    500
  );
  const cards = buildCards({
    carsProfit: 0,
    carsExpenses: 0,
    soldCount: 0,
    detailing,
    documents: documentsSummary([], bounds),
  });
  check("detailing only net", cards.detailing.netResult === 6300);
  check("detailing only combined", combinedResult(cards) === 6300);
}

// Documents only — cash-completed
{
  const docs = documentsSummary(
    [
      {
        status: "DELIVERED",
        delivered_at: "2026-03-10T00:00:00.000Z",
        updated_at: "2026-03-10T00:00:00.000Z",
        service_price: 3000,
        cost_price: 800,
        paid_amount: 3000,
      },
    ],
    bounds
  );
  const cards = buildCards({
    carsProfit: 0,
    carsExpenses: 0,
    soldCount: 0,
    detailing: detailingSummary([], 0),
    documents: docs,
  });
  check("documents only profit", cards.documents.profit === 2200);
  check("documents only combined", combinedResult(cards) === 2200);
}

// All three
{
  const cards = buildCards({
    carsProfit: 50000,
    carsExpenses: 10000,
    soldCount: 1,
    detailing: detailingSummary(
      [{ status: "delivered", final_price: 10000, commission_total: 1500 }],
      1000
    ),
    documents: documentsSummary(
      [
        {
          status: "DELIVERED",
          delivered_at: "2026-03-20T00:00:00.000Z",
          updated_at: "2026-03-20T00:00:00.000Z",
          service_price: 4000,
          cost_price: 1000,
          paid_amount: 4000,
        },
      ],
      bounds
    ),
  });
  check("all three combined", combinedResult(cards) === 50000 + 7500 + 3000);
  check(
    "chart matches cards",
    chartSummary(cards).every(
      (bar, i) =>
        bar.profit ===
        [cards.cars.profit, cards.detailing.netResult, cards.documents.profit][i]
    )
  );
}

// Negative documents profit
{
  const docs = documentsSummary(
    [
      {
        status: "COMPLETED",
        completed_at: "2026-03-05",
        updated_at: "2026-03-05T00:00:00.000Z",
        service_price: 1000,
        cost_price: 2500,
        paid_amount: 1000,
      },
    ],
    bounds
  );
  check("negative documents profit", docs.profit === -1500);
}

// Unpaid final documents excluded from profit, counted as receivables
{
  const docs = documentsSummary(
    [
      {
        status: "DELIVERED",
        delivered_at: "2026-03-12T00:00:00.000Z",
        updated_at: "2026-03-12T00:00:00.000Z",
        service_price: 6000,
        cost_price: 500,
        paid_amount: 0,
      },
    ],
    bounds
  );
  check("unpaid final excluded from profit count", docs.completedCount === 0);
  check("unpaid final excluded from profit", docs.profit === 0);
  check("unpaid revenue is receivables", docs.unpaidRevenue === 6000);
}

// Custom date range
{
  const customBounds = { start: "2026-01-15", end: "2026-01-20" };
  const docs = documentsSummary(
    [
      {
        status: "DELIVERED",
        delivered_at: "2026-01-18T00:00:00.000Z",
        updated_at: "2026-01-18T00:00:00.000Z",
        service_price: 2000,
        cost_price: 200,
        paid_amount: 2000,
      },
      {
        status: "DELIVERED",
        delivered_at: "2026-02-01T00:00:00.000Z",
        updated_at: "2026-02-01T00:00:00.000Z",
        service_price: 9000,
        cost_price: 100,
        paid_amount: 9000,
      },
    ],
    customBounds
  );
  check("custom range filters tasks", docs.completedCount === 1 && docs.revenue === 2000);
}

// Empty period
{
  const cards = buildCards({
    carsProfit: 0,
    carsExpenses: 0,
    soldCount: 0,
    detailing: detailingSummary([], 0),
    documents: documentsSummary([], bounds),
  });
  check("empty period combined zero", combinedResult(cards) === 0);
  check(
    "empty period chart still three",
    chartSummary(cards).every((bar) => bar.profit === 0)
  );
}

console.log(`finance business directions: ${passed} assertions passed`);
