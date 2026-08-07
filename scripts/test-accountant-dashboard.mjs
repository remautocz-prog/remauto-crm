import assert from "node:assert/strict";

const ROLE_PERMS = {
  owner: new Set(["accounting.dashboard", "finance.view", "owner.dashboard"]),
  accountant: new Set(["accounting.dashboard", "finance.view"]),
  admin: new Set(["accounting.dashboard", "finance.view", "admin.dashboard"]),
  detailing: new Set(["detailing.view"]),
  documents: new Set(["documents.view"]),
};

function hasPermission(role, permission) {
  return ROLE_PERMS[role]?.has(permission) ?? false;
}

function isRouteAllowed(role, pathname) {
  if (pathname === "/accounting/dashboard") {
    return hasPermission(role, "accounting.dashboard");
  }
  if (pathname === "/dashboard") {
    return hasPermission(role, "owner.dashboard");
  }
  return true;
}

function getDefaultRoute(role) {
  if (role === "accountant") return "/accounting/dashboard";
  if (role === "admin") return "/admin/dashboard";
  if (role === "owner") return "/dashboard";
  return "/access-disabled";
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

check("accountant default route", getDefaultRoute("accountant") === "/accounting/dashboard");
check("owner can access accounting dashboard", hasPermission("owner", "accounting.dashboard"));
check("accountant can access accounting dashboard", hasPermission("accountant", "accounting.dashboard"));
check("admin can access accounting dashboard", hasPermission("admin", "accounting.dashboard"));
check("detailing cannot access accounting dashboard", !hasPermission("detailing", "accounting.dashboard"));
check("documents cannot access accounting dashboard", !hasPermission("documents", "accounting.dashboard"));
check("accountant route allowed", isRouteAllowed("accountant", "/accounting/dashboard"));
check("detailing route denied", !isRouteAllowed("detailing", "/accounting/dashboard"));
check("accountant cannot access owner dashboard", !hasPermission("accountant", "owner.dashboard"));

console.log(`accountant dashboard checks: ${passed} assertions passed`);
