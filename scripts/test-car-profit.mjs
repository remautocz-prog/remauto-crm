#!/usr/bin/env node
/**
 * Validates car profit calculations with vehicle expenses (incl. third-party commission).
 * Run: node scripts/test-car-profit.mjs
 */

function resolveSaleBasePrice(car) {
  const actualSale = car.actual_sale_price;
  if (actualSale != null && !Number.isNaN(actualSale) && actualSale > 0) {
    return { price: Number(actualSale), isActual: true, isEstimate: false };
  }
  const salePrice = car.sale_price;
  if (salePrice != null && !Number.isNaN(salePrice) && salePrice > 0) {
    return { price: Number(salePrice), isActual: false, isEstimate: true };
  }
  return { price: 0, isActual: false, isEstimate: true };
}

function calculateGrossCommission(car, saleBasePrice) {
  if (car.commission_type === "fixed") return Number(car.commission_value ?? 0);
  if (car.commission_type === "percentage") {
    return saleBasePrice * Number(car.commission_value ?? 0) / 100;
  }
  return 0;
}

function calculateCarProfit(car, totalExpenses) {
  const businessModel = car.business_model ?? "owned";
  const saleBase = resolveSaleBasePrice(car);

  if (businessModel === "owned") {
    const purchasePrice = Number(car.purchase_price ?? 0);
    const netProfit = saleBase.price > 0
      ? saleBase.price - purchasePrice - totalExpenses
      : -purchasePrice - totalExpenses;
    return { netProfit, grossCommission: null, isEstimate: !saleBase.isActual };
  }

  const grossCommission = calculateGrossCommission(car, saleBase.price);
  return {
    netProfit: grossCommission - totalExpenses,
    grossCommission,
    isEstimate: !saleBase.isActual,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
    return false;
  }
  console.log("OK:", message);
  return true;
}

const ownedCar = {
  business_model: "owned",
  purchase_price: 300000,
  sale_price: 400000,
  actual_sale_price: null,
  status: "in_stock",
};

const commissionCar = {
  business_model: "commission",
  owner_net_amount: 350000,
  commission_type: "fixed",
  commission_value: 25000,
  sale_price: 400000,
  actual_sale_price: null,
  status: "in_stock",
};

console.log("=== Car profit + third-party commission tests ===\n");

const baseOwnedProfit = calculateCarProfit(ownedCar, 0).netProfit;
assert(baseOwnedProfit === 100000, "Owned vehicle base projected profit = 100,000");

const withCommissionExpense = calculateCarProfit(ownedCar, 20000).netProfit;
assert(
  withCommissionExpense === 80000,
  "Owned vehicle profit decreases by 20,000 after third-party commission expense"
);
assert(
  baseOwnedProfit - withCommissionExpense === 20000,
  "Profit delta equals expense amount exactly (no double deduction)"
);

const commissionBase = calculateCarProfit(commissionCar, 0).netProfit;
const commissionWithExpense = calculateCarProfit(commissionCar, 20000).netProfit;
assert(commissionBase === 25000, "Commission vehicle RemAuto profit = 25,000");
assert(
  commissionWithExpense === 5000,
  "Commission vehicle profit decreases by 20,000 (single deduction via total expenses)"
);

const soldOwned = {
  ...ownedCar,
  status: "sold",
  actual_sale_price: 410000,
};
const soldProfit = calculateCarProfit(soldOwned, 20000).netProfit;
assert(
  soldProfit === 90000,
  "Final profit uses actual sale price minus purchase and all expenses"
);

console.log("\nDone.");
