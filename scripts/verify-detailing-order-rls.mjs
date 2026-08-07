/**
 * Static verification for detailing order create RLS (no DB required).
 * Run: node scripts/verify-detailing-order-rls.mjs
 *
 * Live DB checks (run in Supabase SQL editor while impersonating each role):
 *
 *   select auth.uid(), public.current_user_role(), public.can_create_detailing_orders();
 *
 *   select tablename, policyname, cmd, qual, with_check
 *   from pg_policies
 *   where schemaname = 'public'
 *     and tablename in ('detailing_orders', 'detailing_order_services')
 *   order by tablename, cmd, policyname;
 */

import assert from "node:assert/strict";

const ROLES = ["owner", "admin", "detailing", "documents", "accountant", "inactive"];

const APP_CREATE_ROLES = new Set(["owner", "admin", "detailing"]);

const DB_CREATE_ROLES = new Set(["owner", "admin", "detailing"]);

/** Mirrors public.can_create_detailing_orders() after migration 030 */
function canCreateDetailingOrders(role, isActive = true) {
  if (!isActive || role === "inactive") return false;
  return DB_CREATE_ROLES.has(role);
}

/** Mirrors INSERT WITH CHECK after migration 030 */
function insertWithCheckPasses(role, createdBy, authUid, isActive = true) {
  if (!canCreateDetailingOrders(role, isActive)) return false;
  const isAdminOrOwner = role === "owner" || role === "admin";
  return isAdminOrOwner || createdBy === authUid;
}

/** Mirrors 026 can_access_detailing_order for new unassigned order (no created_by) */
function legacySelectReturningPasses(role, assignedToAuth = false) {
  if (role === "owner" || role === "admin") return true;
  if (role === "accountant") return true;
  if (role === "detailing") return assignedToAuth;
  return false;
}

/** Mirrors can_read_detailing_order after migration 030 for new order */
function newOrderReadPasses(role, createdBy, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (role === "owner" || role === "admin") return true;
  if (role === "accountant") return true;
  if (canCreateDetailingOrders(role, isActive)) {
    return createdBy === authUid;
  }
  return false;
}

const AUTH_UID = "11111111-1111-1111-1111-111111111111";

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

console.log("=== App permission: detailing.create ===\n");
for (const role of ROLES) {
  const allowed = APP_CREATE_ROLES.has(role) && role !== "inactive";
  console.log(`  ${role.padEnd(12)} -> ${allowed ? "ALLOW" : "DENY"}`);
}

console.log("\n=== DB can_create_detailing_orders() (migration 030) ===\n");
for (const role of ROLES) {
  const allowed = canCreateDetailingOrders(role, role !== "inactive");
  console.log(`  ${role.padEnd(12)} -> ${allowed ? "true" : "false"}`);
}

console.log("\n=== INSERT WITH CHECK (030) — created_by = auth.uid() ===\n");
for (const role of ROLES) {
  const isActive = role !== "inactive";
  const ok = insertWithCheckPasses(role, AUTH_UID, AUTH_UID, isActive);
  console.log(`  ${role.padEnd(12)} -> ${ok ? "PASS" : "FAIL"}`);
}

console.log("\n=== Legacy 026: INSERT .select(id) RETURNING on new unassigned order ===\n");
for (const role of ROLES) {
  const ok = legacySelectReturningPasses(role, false);
  console.log(`  ${role.padEnd(12)} -> SELECT RETURNING ${ok ? "PASS" : "FAIL (42501)"}`);
}

console.log("\n=== After 030: read path for new order (created_by set) ===\n");
for (const role of ROLES) {
  const isActive = role !== "inactive";
  const ok = newOrderReadPasses(role, AUTH_UID, AUTH_UID, isActive);
  console.log(`  ${role.padEnd(12)} -> ${ok ? "PASS" : "FAIL"}`);
}

console.log("\n=== Verification matrix (expected after 030 + app fix) ===\n");
const matrix = [
  ["owner", true],
  ["admin", true],
  ["detailing", true],
  ["documents", false],
  ["accountant", false],
  ["inactive", false],
];

for (const [role, expected] of matrix) {
  const isActive = role !== "inactive";
  const appOk = APP_CREATE_ROLES.has(role) && isActive;
  const dbOk = insertWithCheckPasses(role, AUTH_UID, AUTH_UID, isActive);
  const readOk = newOrderReadPasses(role, AUTH_UID, AUTH_UID, isActive);
  const overall = appOk && dbOk && readOk;
  check(`${role} create ${expected ? "OK" : "denied"}`, overall === expected);
  console.log(`  ${role.padEnd(12)} -> ${overall ? "create OK" : "denied"} ${overall === expected ? "✓" : "✗"}`);
}

console.log(`\nDetailing order RLS verification passed (${passed} assertions).`);
console.log("\nApply migration: supabase/migrations/030_detailing_orders_insert_rls_fix.sql");
console.log("Then re-test create order as a detailing employee in the app.");
