/**
 * Static verification for storage document security (migration 032).
 * Run: node scripts/verify-storage-document-security-rls.mjs
 *
 * Live DB checks after applying 032:
 *   scripts/verify-storage-document-security-db.sql
 */

import assert from "node:assert/strict";

const READ_MODULE = new Set(["owner", "admin", "documents", "lawyer", "accountant"]);
const MANAGE_MODULE = new Set(["owner", "admin", "documents", "lawyer"]);

const TEMPLATE_ID = "11111111-1111-1111-1111-111111111111";
const GENERATED_ID = "22222222-2222-2222-2222-222222222222";
const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const TEMPLATE_PATH = `templates/${TEMPLATE_ID}/1234567890-contract.docx`;
const GENERATED_PATH = `generated/2026/07/42/${GENERATED_ID}/contract.docx`;
const BAD_TEMPLATE_PATH = "templates/not-a-uuid/file.docx";
const BAD_GENERATED_PATH = "generated/2026/07/42/not-a-uuid/file.docx";

function storageTemplateIdFromPath(objectPath) {
  const parts = objectPath.split("/");
  if (parts[0] !== "templates") return null;
  const id = parts[1];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? "")) {
    return null;
  }
  return id;
}

function storageGeneratedIdFromPath(objectPath) {
  const parts = objectPath.split("/");
  if (parts[0] !== "generated") return null;
  const id = parts[4];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? "")) {
    return null;
  }
  return id;
}

function canReadDocumentTask(role, assignedTo, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (!READ_MODULE.has(role)) return false;
  if (role === "owner" || role === "admin") return true;
  if (role === "lawyer" || role === "accountant") return true;
  if (role === "documents") return assignedTo === authUid;
  return false;
}

function canModifyDocumentTask(role, assignedTo, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (!MANAGE_MODULE.has(role)) return false;
  if (role === "owner" || role === "admin" || role === "lawyer") return true;
  if (role === "documents") return assignedTo === authUid;
  return false;
}

function canReadTemplateStorage(role, path, isActive = true) {
  if (!isActive || role === "inactive") return false;
  return READ_MODULE.has(role) && storageTemplateIdFromPath(path) !== null;
}

function canManageTemplateStorage(role, path, isActive = true) {
  if (!isActive || role === "inactive") return false;
  return (role === "owner" || role === "admin") && storageTemplateIdFromPath(path) !== null;
}

function canReadGeneratedStorage(role, path, row, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (!READ_MODULE.has(role)) return false;
  if (storageGeneratedIdFromPath(path) === null) return false;
  if (role === "owner" || role === "admin") return true;
  if (!row) return false;
  if (row.document_task_id == null) return true;
  return canReadDocumentTask(role, row.assigned_to, authUid, isActive);
}

function canInsertGeneratedStorage(role, path, isActive = true) {
  if (!isActive || role === "inactive") return false;
  return MANAGE_MODULE.has(role) && storageGeneratedIdFromPath(path) !== null;
}

function canDeleteTemplateStorage(role, path, isActive = true) {
  if (!isActive || role === "inactive") return false;
  return role === "owner" && storageTemplateIdFromPath(path) !== null;
}

function canDeleteGeneratedStorage(role, path, isActive = true) {
  if (!isActive || role === "inactive") return false;
  return role === "owner" && storageGeneratedIdFromPath(path) !== null;
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

console.log("=== Path helpers ===\n");
check("template id parsed", storageTemplateIdFromPath(TEMPLATE_PATH) === TEMPLATE_ID);
check("generated id parsed", storageGeneratedIdFromPath(GENERATED_PATH) === GENERATED_ID);
check("bad template path rejected", storageTemplateIdFromPath(BAD_TEMPLATE_PATH) === null);
check("bad generated path rejected", storageGeneratedIdFromPath(BAD_GENERATED_PATH) === null);

console.log("=== Template storage by role ===\n");
check("owner reads template", canReadTemplateStorage("owner", TEMPLATE_PATH));
check("documents reads template", canReadTemplateStorage("documents", TEMPLATE_PATH));
check("detailing denied template read", !canReadTemplateStorage("detailing", TEMPLATE_PATH));
check("admin manages template", canManageTemplateStorage("admin", TEMPLATE_PATH));
check("documents denied template write", !canManageTemplateStorage("documents", TEMPLATE_PATH));
check("owner deletes template", canDeleteTemplateStorage("owner", TEMPLATE_PATH));
check("admin denied template delete", !canDeleteTemplateStorage("admin", TEMPLATE_PATH));

console.log("=== Generated storage — documents employee isolation ===\n");
const rowForA = { document_task_id: 1, assigned_to: USER_A };
const rowForB = { document_task_id: 2, assigned_to: USER_B };

check(
  "A reads own generated file",
  canReadGeneratedStorage("documents", GENERATED_PATH, rowForA, USER_A)
);
check(
  "A denied B generated file",
  !canReadGeneratedStorage("documents", GENERATED_PATH, rowForB, USER_A)
);
check(
  "A denied orphan generated file",
  !canReadGeneratedStorage("documents", GENERATED_PATH, null, USER_A)
);
check(
  "A can upload generated file",
  canInsertGeneratedStorage("documents", GENERATED_PATH)
);
check(
  "detailing denied generated read",
  !canReadGeneratedStorage("detailing", GENERATED_PATH, rowForA, USER_A)
);

console.log("=== Generated storage — lawyer / accountant preserved ===\n");
check(
  "lawyer reads task B file",
  canReadGeneratedStorage("lawyer", GENERATED_PATH, rowForB, USER_A)
);
check(
  "accountant reads task B file",
  canReadGeneratedStorage("accountant", GENERATED_PATH, rowForB, USER_A)
);
check(
  "lawyer uploads generated file",
  canInsertGeneratedStorage("lawyer", GENERATED_PATH)
);

console.log("=== Generated storage — owner/admin ===\n");
check("owner reads any", canReadGeneratedStorage("owner", GENERATED_PATH, rowForB, USER_A));
check("admin reads any", canReadGeneratedStorage("admin", GENERATED_PATH, rowForB, USER_A));
check("owner deletes generated", canDeleteGeneratedStorage("owner", GENERATED_PATH));
check("admin denied generated delete", !canDeleteGeneratedStorage("admin", GENERATED_PATH));

console.log(`\nStorage document security verification passed (${passed} assertions).`);
console.log("\nApply migration: supabase/migrations/032_storage_document_security.sql");
console.log("Then run: scripts/verify-storage-document-security-db.sql in Supabase SQL Editor");
