#!/usr/bin/env node
/**
 * Validates car form payloads and normalization for all business models.
 * Run: node scripts/test-car-validation.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

// Inline minimal copies of validation/normalization logic for the script
function isBlankString(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function isMissingPositiveNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return true;
  return value <= 0;
}

function normalizeOptionalString(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeOptionalUuid(value) {
  return normalizeOptionalString(value);
}

function normalizeCarPayload(input) {
  const model = input.business_model ?? "owned";
  const base = {
    stock_number: normalizeOptionalString(input.stock_number),
    vin: normalizeOptionalString(input.vin),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    registration_number: normalizeOptionalString(input.registration_number),
    color: normalizeOptionalString(input.color),
    status: input.status.trim(),
    business_model: model,
    manager_id: normalizeOptionalUuid(input.manager_id),
    notes: normalizeOptionalString(input.notes),
    sale_price: input.sale_price ?? null,
    actual_sale_price: input.actual_sale_price ?? null,
    purchase_date: normalizeOptionalString(input.purchase_date),
    sale_date: normalizeOptionalString(input.sale_date),
  };

  if (model === "owned") {
    return {
      ...base,
      purchase_price: input.purchase_price ?? null,
      client_id: input.client_id ?? null,
      commission_type: null,
      commission_value: null,
      owner_net_amount: null,
      owner_client_id: null,
      contract_end_date: null,
      contract_document_url: null,
    };
  }

  if (model === "commission") {
    return {
      ...base,
      purchase_price: null,
      client_id: input.client_id ?? null,
      commission_type: input.commission_type ?? null,
      commission_value: input.commission_value ?? null,
      owner_net_amount: input.owner_net_amount ?? null,
      owner_client_id: input.owner_client_id ?? null,
      contract_end_date: normalizeOptionalString(input.contract_end_date),
      contract_document_url: normalizeOptionalString(input.contract_document_url),
    };
  }

  return {
    ...base,
    purchase_price: input.purchase_price ?? null,
    client_id: input.client_id ?? null,
    commission_type: input.commission_type ?? null,
    commission_value: input.commission_value ?? null,
    owner_net_amount: null,
    owner_client_id: null,
    contract_end_date: null,
    contract_document_url: null,
  };
}

function collectIssues(input) {
  const issues = [];
  const model = input.business_model ?? "owned";

  if (isBlankString(input.brand)) issues.push("brand");
  if (isBlankString(input.model)) issues.push("model");
  if (isBlankString(input.vin)) issues.push("vin");
  if (!input.status?.trim()) issues.push("status");

  if (model === "commission") {
    if (isMissingPositiveNumber(input.owner_net_amount)) issues.push("owner_net_amount");
    if (!input.commission_type) issues.push("commission_type");
    if (isMissingPositiveNumber(input.commission_value)) issues.push("commission_value");
  }

  if (model === "client_order") {
    if (input.client_id == null || Number.isNaN(input.client_id)) issues.push("client_id");
    if (!input.commission_type) issues.push("commission_type");
    if (isMissingPositiveNumber(input.commission_value)) issues.push("commission_value");
  }

  return issues;
}

const samples = {
  owned: {
    brand: "BMW",
    model: "320d",
    year: 2019,
    vin: "WBAAA31060AE12345",
    status: "in_stock",
    business_model: "owned",
    manager_id: "",
    purchase_date: "",
    sale_date: "",
    client_id: null,
    commission_type: null,
    commission_value: null,
    owner_net_amount: null,
  },
  commission: {
    brand: "Audi",
    model: "A4",
    year: 2020,
    vin: "WAUZZZ8K9KA123456",
    status: "in_stock",
    business_model: "commission",
    owner_net_amount: 250000,
    commission_type: "fixed",
    commission_value: 15000,
    manager_id: "",
    purchase_date: "",
    sale_date: "",
  },
  client_order: {
    brand: "Skoda",
    model: "Octavia",
    year: 2021,
    vin: "TMBJF7NE5M0123456",
    status: "in_stock",
    business_model: "client_order",
    client_id: 1,
    commission_type: "percentage",
    commission_value: 5,
    manager_id: "",
    purchase_date: "",
    sale_date: "",
  },
};

console.log("=== Validation + normalization self-test ===\n");

for (const [name, sample] of Object.entries(samples)) {
  const issues = collectIssues(sample);
  const payload = normalizeCarPayload(sample);
  console.log(name);
  console.log("  validation issues:", issues.length ? issues.join(", ") : "(none)");
  console.log("  manager_id in payload:", JSON.stringify(payload.manager_id));
  console.log("  purchase_date in payload:", JSON.stringify(payload.purchase_date));
  console.log("  sale_date in payload:", JSON.stringify(payload.sale_date));

  const badValues = Object.entries(payload).filter(([, value]) => value === "");
  if (badValues.length) {
    console.log("  ERROR empty strings:", badValues.map(([k]) => k).join(", "));
  } else {
    console.log("  no empty strings in payload");
  }
  console.log("");
}

const env = loadEnvFile(resolve(root, ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.log("Skipping live insert test (missing .env.local)");
  process.exit(0);
}

const supabase = createClient(url, key);

async function tryInsert(label, sample) {
  const issues = collectIssues(sample);
  if (issues.length) {
    console.log(`${label}: skipped insert, validation issues: ${issues.join(", ")}`);
    return;
  }

  const payload = normalizeCarPayload(sample);
  const { data, error } = await supabase.from("cars").insert(payload).select("id").single();
  if (error) {
    console.log(`${label}: INSERT FAILED -> ${error.message}`);
    return;
  }

  console.log(`${label}: INSERT OK id=${data.id}`);
  await supabase.from("cars").delete().eq("id", data.id);
}

console.log("=== Live Supabase insert test (anon; may fail on RLS without auth) ===\n");
for (const [name, sample] of Object.entries(samples)) {
  await tryInsert(name, { ...sample, vin: sample.vin.replace(/\d$/, String(Math.floor(Math.random() * 10))) });
}
