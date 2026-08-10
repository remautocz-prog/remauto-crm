/**
 * Static verification for documents task assignment RLS (no DB required).
 * Run: node scripts/verify-documents-task-assignment-rls.mjs
 *
 * Live DB checks after applying 031:
 *   scripts/verify-documents-task-assignment-db.sql
 */

import assert from "node:assert/strict";

const ROLES = ["owner", "admin", "documents", "lawyer", "accountant", "inactive"];

const READ_MODULE_ROLES = new Set(["owner", "admin", "documents", "lawyer", "accountant"]);
const MANAGE_MODULE_ROLES = new Set(["owner", "admin", "documents", "lawyer"]);

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

/** Mirrors document_tasks SELECT policy after migration 031 */
function canReadDocumentTaskRow(role, assignedTo, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (!READ_MODULE_ROLES.has(role)) return false;
  if (role === "documents") return assignedTo === authUid;
  return true;
}

/** Mirrors can_read_document_task(task_id) after migration 031 */
function canReadDocumentTaskById(role, assignedTo, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (!READ_MODULE_ROLES.has(role)) return false;
  if (role === "owner" || role === "admin") return true;
  if (role === "lawyer" || role === "accountant") return true;
  if (role === "documents") return assignedTo === authUid;
  return false;
}

/** Mirrors can_modify_document_task(task_id) after migration 031 */
function canModifyDocumentTask(role, assignedTo, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (!MANAGE_MODULE_ROLES.has(role)) return false;
  if (role === "owner" || role === "admin" || role === "lawyer") return true;
  if (role === "documents") return assignedTo === authUid;
  return false;
}

/** Mirrors INSERT WITH CHECK for documents role */
function canInsertDocumentTask(role, assignedTo, authUid, isActive = true) {
  if (!isActive || role === "inactive") return false;
  if (role === "documents") return assignedTo === authUid;
  return MANAGE_MODULE_ROLES.has(role);
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

console.log("=== Documents employee A reads tasks ===\n");
check("A reads own task", canReadDocumentTaskRow("documents", USER_A, USER_A));
check("A denied B task", !canReadDocumentTaskRow("documents", USER_B, USER_A));
check("A denied unassigned", !canReadDocumentTaskRow("documents", null, USER_A));

console.log("=== Documents employee B inverse ===\n");
check("B reads own task", canReadDocumentTaskRow("documents", USER_B, USER_B));
check("B denied A task", !canReadDocumentTaskRow("documents", USER_A, USER_B));

console.log("=== Owner / Admin read all ===\n");
check("owner reads A", canReadDocumentTaskRow("owner", USER_A, USER_A));
check("owner reads B", canReadDocumentTaskRow("owner", USER_B, USER_A));
check("admin reads B", canReadDocumentTaskRow("admin", USER_B, USER_A));

console.log("=== Lawyer / Accountant preserved ===\n");
check("lawyer reads A", canReadDocumentTaskRow("lawyer", USER_A, USER_A));
check("lawyer reads B", canReadDocumentTaskRow("lawyer", USER_B, USER_A));
check("accountant reads B", canReadDocumentTaskRow("accountant", USER_B, USER_A));

console.log("=== Child helper can_read_document_task ===\n");
check("A child read own", canReadDocumentTaskById("documents", USER_A, USER_A));
check("A child denied B", !canReadDocumentTaskById("documents", USER_B, USER_A));

console.log("=== Modify / archive / services ===\n");
check("A modifies own", canModifyDocumentTask("documents", USER_A, USER_A));
check("A denied modify B", !canModifyDocumentTask("documents", USER_B, USER_A));
check("admin modifies B", canModifyDocumentTask("admin", USER_B, USER_A));
check("lawyer modifies B", canModifyDocumentTask("lawyer", USER_B, USER_A));
check("accountant denied modify", !canModifyDocumentTask("accountant", USER_B, USER_A));

console.log("=== Insert assignment binding ===\n");
check("documents insert self-assigned", canInsertDocumentTask("documents", USER_A, USER_A));
check("documents denied insert for B", !canInsertDocumentTask("documents", USER_B, USER_A));
check("documents denied unassigned insert", !canInsertDocumentTask("documents", null, USER_A));

console.log("=== Inactive denied ===\n");
check("inactive read denied", !canReadDocumentTaskRow("inactive", USER_A, USER_A, false));

console.log(`\nDocuments task assignment RLS verification passed (${passed} assertions).`);
console.log("\nApply migration: supabase/migrations/031_documents_task_assignment_rls.sql");
console.log("Then re-test /documents/[id] URL tampering as two documents employees.");
