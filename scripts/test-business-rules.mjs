#!/usr/bin/env node
/**
 * Business-model rules self-test.
 * Run: node scripts/test-business-rules.mjs
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

async function loadRules() {
  const distPath = resolve(root, ".next/server/chunks");
  if (existsSync(distPath)) {
    // Prefer compiled module in build output when available.
  }

  const modulePath = pathToFileURL(resolve(root, "lib/cars/business-rules.ts")).href;
  return import(modulePath);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ownedCar = {
  business_model: "owned",
  purchase_price: 200000,
  sale_price: 250000,
  actual_sale_price: null,
  status: "in_stock",
  commission_type: null,
  commission_value: null,
};

const commissionFixed = {
  business_model: "commission",
  purchase_price: null,
  owner_net_amount: 180000,
  commission_type: "fixed",
  commission_value: 12000,
  sale_price: 220000,
  actual_sale_price: null,
  status: "in_stock",
};

const commissionPct = {
  ...commissionFixed,
  commission_type: "percentage",
  commission_value: 5,
  sale_price: 200000,
};

const clientOrderFixed = {
  business_model: "client_order",
  purchase_price: null,
  client_id: 1,
  commission_type: "fixed",
  commission_value: 8000,
  sale_price: 300000,
  actual_sale_price: null,
  status: "in_stock",
};

const clientOrderPct = {
  ...clientOrderFixed,
  commission_type: "percentage",
  commission_value: 3,
};

async function main() {
  const rules = await loadRules();
  const {
    calculateCarProfit,
    collectCarValidationIssues,
    collectMarkSoldValidationIssues,
    normalizeCarPayload,
    getListRowDisplay,
  } = rules;

  console.log("=== Profit rules ===");

  const ownedEstimate = calculateCarProfit(ownedCar, 5000);
  assert(ownedEstimate.netProfit === 45000, "owned estimated profit");
  assert(ownedEstimate.grossCommission === null, "owned has no commission");

  const ownedSold = calculateCarProfit(
    { ...ownedCar, actual_sale_price: 260000, status: "sold" },
    5000
  );
  assert(ownedSold.netProfit === 55000, "owned actual profit");
  assert(ownedSold.revenue === 260000, "owned revenue uses actual sale");

  const commissionProfit = calculateCarProfit(commissionFixed, 2000);
  assert(commissionProfit.grossCommission === 12000, "commission fixed gross");
  assert(commissionProfit.netProfit === 10000, "commission net profit");

  const commissionPctProfit = calculateCarProfit(commissionPct, 0);
  assert(commissionPctProfit.grossCommission === 10000, "commission percentage gross");

  const clientProfit = calculateCarProfit(clientOrderFixed, 1000);
  assert(clientProfit.grossCommission === 8000, "client order fixed gross");
  assert(clientProfit.revenue === 0, "client order revenue only when sold");

  const clientSold = calculateCarProfit(
    { ...clientOrderPct, actual_sale_price: 310000, status: "sold" },
    0
  );
  assert(clientSold.grossCommission === 9300, "client order percentage gross when sold");
  assert(clientSold.revenue === 9300, "client order revenue is commission only");

  console.log("OK");

  console.log("\n=== Validation rules ===");

  const ownedIssues = collectCarValidationIssues({
    brand: "BMW",
    model: "320",
    year: 2020,
    vin: "VIN123",
    status: "in_stock",
    business_model: "owned",
    purchase_price: 100000,
  });
  assert(ownedIssues.length === 0, "owned valid payload");

  const commissionIssues = collectCarValidationIssues({
    brand: "Audi",
    model: "A4",
    year: 2021,
    vin: "VIN456",
    status: "in_stock",
    business_model: "commission",
    owner_net_amount: 150000,
    commission_type: "fixed",
    commission_value: 10000,
  });
  assert(commissionIssues.length === 0, "commission valid payload");

  const pctIssues = collectCarValidationIssues({
    brand: "Skoda",
    model: "Octavia",
    year: 2022,
    vin: "VIN789",
    status: "in_stock",
    business_model: "client_order",
    client_id: 1,
    commission_type: "percentage",
    commission_value: 5,
  });
  assert(
    pctIssues.some((issue) => issue.messageKey === "salePriceRequiredForPercentage"),
    "percentage requires sale base price"
  );

  const markSoldOwnedMissingPurchase = collectMarkSoldValidationIssues(
    { ...ownedCar, purchase_price: null, business_model: "owned" },
    { actual_sale_price: 250000, sale_date: "2026-01-01" }
  );
  assert(
    markSoldOwnedMissingPurchase.some((issue) => issue.field === "purchase_price"),
    "owned mark sold requires existing purchase price"
  );

  const markSoldCommissionMissingTerms = collectMarkSoldValidationIssues(
    { ...commissionFixed, commission_type: null },
    { actual_sale_price: 220000, sale_date: "2026-01-01" }
  );
  assert(
    markSoldCommissionMissingTerms.some((issue) => issue.field === "commission_type"),
    "commission mark sold requires commission terms"
  );

  console.log("OK");

  console.log("\n=== Payload normalization ===");

  const commissionPayload = normalizeCarPayload({
    brand: "Audi",
    model: "A4",
    year: 2020,
    vin: "VIN000",
    status: "in_stock",
    business_model: "commission",
    owner_net_amount: 100000,
    commission_type: "fixed",
    commission_value: 5000,
    manager_id: "",
    purchase_date: "",
  });
  assert(commissionPayload.purchase_price === null, "commission purchase_price null");
  assert(commissionPayload.manager_id === null, "empty manager_id -> null");

  const clientPayload = normalizeCarPayload({
    brand: "Skoda",
    model: "Fabia",
    year: 2019,
    vin: "VIN111",
    status: "in_stock",
    business_model: "client_order",
    client_id: 2,
    commission_type: "fixed",
    commission_value: 7000,
    purchase_price: 99999,
  });
  assert(clientPayload.purchase_price === null, "client_order purchase_price forced null");

  console.log("OK");

  console.log("\n=== List display ===");
  const listRow = getListRowDisplay(commissionFixed);
  assert(listRow.primaryLabelKey === "ownerNetAmount", "commission list primary label");
  assert(listRow.secondary.amount === 12000, "commission list secondary is gross commission");

  console.log("OK");
  console.log("\nAll business-rule tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
