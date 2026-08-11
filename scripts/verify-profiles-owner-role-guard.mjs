/**
 * Static verification for profiles owner-role guard (migration 033).
 * Run: node scripts/verify-profiles-owner-role-guard.mjs
 *
 * Live DB checks after applying 033:
 *   scripts/verify-profiles-owner-role-guard-db.sql
 */

import assert from "node:assert/strict";

const OWNER = "owner-id";
const ADMIN = "admin-id";
const USER = "user-id";

/**
 * Mirrors protect_profile_self_elevation() UPDATE rules after migration 033.
 * serviceRole=true simulates auth.uid() IS NULL (invite upsert).
 */
function canUpdateProfile({
  serviceRole = false,
  actorRole,
  actorActive = true,
  actorId,
  targetId,
  oldRole,
  newRole,
  oldActive = true,
  newActive = true,
  otherActiveOwners = 1,
}) {
  if (serviceRole) return { allowed: true };

  if (!actorActive) {
    return { allowed: false, reason: "inactive actor" };
  }

  if (targetId === actorId) {
    if (newRole !== oldRole) return { allowed: false, reason: "self role" };
    if (newActive !== oldActive) return { allowed: false, reason: "self active" };
  }

  if (newRole === "owner" && oldRole !== "owner" && actorRole !== "owner") {
    return { allowed: false, reason: "admin promote to owner" };
  }

  if (oldRole === "owner" && newRole !== oldRole && actorRole !== "owner") {
    return { allowed: false, reason: "admin change owner role" };
  }

  if (oldRole === "owner" && newActive === false && actorRole !== "owner") {
    return { allowed: false, reason: "admin deactivate owner" };
  }

  if (oldRole === "owner" && newRole !== "owner" && otherActiveOwners === 0) {
    return { allowed: false, reason: "last owner" };
  }

  return { allowed: true };
}

let passed = 0;
function check(label, result) {
  assert.ok(result.allowed, `${label}: ${result.reason ?? "denied"}`);
  passed += 1;
}
function checkDenied(label, result, expectedReason) {
  assert.equal(result.allowed, false, label);
  if (expectedReason) assert.equal(result.reason, expectedReason, `${label} reason`);
  passed += 1;
}

console.log("=== Owner management ===\n");
check(
  "owner promotes user to owner",
  canUpdateProfile({
    actorRole: "owner",
    actorId: OWNER,
    targetId: USER,
    oldRole: "admin",
    newRole: "owner",
  })
);
check(
  "owner edits owner full_name (role unchanged)",
  canUpdateProfile({
    actorRole: "owner",
    actorId: OWNER,
    targetId: "other-owner",
    oldRole: "owner",
    newRole: "owner",
  })
);

console.log("=== Admin blocked from owner operations ===\n");
checkDenied(
  "admin promote non-owner to owner DENIED",
  canUpdateProfile({
    actorRole: "admin",
    actorId: ADMIN,
    targetId: USER,
    oldRole: "documents",
    newRole: "owner",
  }),
  "admin promote to owner"
);
checkDenied(
  "admin modify existing owner role DENIED",
  canUpdateProfile({
    actorRole: "admin",
    actorId: ADMIN,
    targetId: OWNER,
    oldRole: "owner",
    newRole: "admin",
  }),
  "admin change owner role"
);
checkDenied(
  "admin deactivate owner DENIED",
  canUpdateProfile({
    actorRole: "admin",
    actorId: ADMIN,
    targetId: OWNER,
    oldRole: "owner",
    newRole: "owner",
    newActive: false,
  }),
  "admin deactivate owner"
);

console.log("=== Self-elevation blocked ===\n");
checkDenied(
  "user self-promote DENIED",
  canUpdateProfile({
    actorRole: "admin",
    actorId: ADMIN,
    targetId: ADMIN,
    oldRole: "admin",
    newRole: "owner",
  }),
  "self role"
);

console.log("=== Inactive blocked ===\n");
checkDenied(
  "inactive admin DENIED",
  canUpdateProfile({
    actorRole: "admin",
    actorId: ADMIN,
    actorActive: false,
    targetId: USER,
    oldRole: "documents",
    newRole: "documents",
  }),
  "inactive actor"
);

console.log("=== Service role invite compatibility ===\n");
check(
  "service role upsert allowed",
  canUpdateProfile({
    serviceRole: true,
    actorRole: "admin",
    targetId: USER,
    oldRole: "inactive",
    newRole: "documents",
    newActive: true,
  })
);

console.log(`\nProfiles owner-role guard verification passed (${passed} assertions).`);
console.log("\nApply migration: supabase/migrations/033_profiles_owner_role_guard.sql");
console.log("Then run: scripts/verify-profiles-owner-role-guard-db.sql in Supabase SQL Editor");
