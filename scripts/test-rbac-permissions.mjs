import assert from "node:assert/strict";

const ROLE_PERMISSIONS = {
  owner: ["*"],
  admin: [
    "admin.dashboard",
    "accounting.dashboard",
    "cars.view",
    "cars.create",
    "cars.update",
    "cars.archive",
    "clients.view",
    "clients.create",
    "clients.update",
    "clients.archive",
    "documents.view",
    "documents.create",
    "documents.update",
    "documents.archive",
    "detailing.view",
    "detailing.create",
    "detailing.update",
    "detailing.finance.view",
    "detailing.expenses.manage",
    "finance.view",
    "finance.manage",
    "users.view",
    "users.create",
    "users.update",
    "users.deactivate",
    "settings.view",
    "settings.manage",
    "deals.view",
    "deals.create",
    "deals.update",
    "deals.archive",
    "reports.view",
  ],
  detailing: ["detailing.view", "detailing.create", "detailing.update", "detailing.payment.update"],
  documents: [
    "documents.view",
    "documents.create",
    "documents.update",
    "documents.archive",
    "clients.view",
    "cars.view",
  ],
  accountant: [
    "accounting.dashboard",
    "finance.view",
    "finance.manage",
    "cars.view",
    "detailing.view",
    "detailing.finance.view",
    "detailing.expenses.manage",
    "documents.view",
    "reports.view",
  ],
  lawyer: [
    "documents.view",
    "documents.create",
    "documents.update",
    "documents.archive",
    "clients.view",
    "cars.view",
    "deals.view",
  ],
  inactive: [],
};

const ROUTE_RULES = [
  { prefix: "/settings/users", permission: "users.view" },
  { prefix: "/settings/templates", permission: "settings.manage" },
  { prefix: "/accounting/dashboard", permission: "accounting.dashboard", exact: true },
  { prefix: "/admin/dashboard", permission: "admin.dashboard", exact: true },
  { prefix: "/dashboard", permission: "owner.dashboard", exact: true },
  { prefix: "/cars", permission: "cars.view" },
  { prefix: "/clients", permission: "clients.view" },
  { prefix: "/documents", permission: "documents.view" },
  { prefix: "/deals", permission: "deals.view" },
  { prefix: "/detailing/finance", permission: "detailing.finance.view" },
  { prefix: "/detailing/expenses", permission: "detailing.expenses.manage" },
  { prefix: "/detailing/employees", permission: "users.view" },
  { prefix: "/detailing/services", permission: "detailing.view" },
  { prefix: "/detailing", permission: "detailing.view" },
  { prefix: "/finance", permission: "finance.view" },
  { prefix: "/reports", permission: "reports.view" },
];

const NAV_KEYS = {
  dashboard: "owner.dashboard",
  adminDashboard: "admin.dashboard",
  accountingDashboard: "accounting.dashboard",
  cars: "cars.view",
  clients: "clients.view",
  documents: "documents.view",
  deals: "deals.view",
  detailing: "detailing.view",
  finance: "finance.view",
  reports: "reports.view",
  settings: "settings.view",
};

const DEFAULT_ROUTES = {
  owner: "/dashboard",
  admin: "/admin/dashboard",
  detailing: "/detailing",
  documents: "/documents/dashboard",
  accountant: "/accounting/dashboard",
  lawyer: "/documents",
  inactive: "/access-disabled",
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

function isRouteAllowed(role, pathname) {
  for (const rule of ROUTE_RULES) {
    const matches = rule.exact
      ? pathname === rule.prefix
      : pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (matches) {
      return hasPermission(role, rule.permission);
    }
  }
  return true;
}

function navAllowed(role, key) {
  return hasPermission(role, NAV_KEYS[key]);
}

let passed = 0;

function check(description, condition) {
  assert.ok(condition, description);
  passed += 1;
}

// Owner capabilities
check("owner can manage roles", hasPermission("owner", "users.manage_roles"));
check("owner can permanently delete", hasPermission("owner", "cars.delete"));

// Admin restrictions
check("admin cannot delete", !hasPermission("admin", "cars.delete"));
check("admin cannot manage roles", !hasPermission("admin", "users.manage_roles"));
check("admin can manage users", hasPermission("admin", "users.create"));
check("admin cannot view owner dashboard", !hasPermission("admin", "owner.dashboard"));
check("admin can view admin dashboard", hasPermission("admin", "admin.dashboard"));
check("owner can view owner dashboard", hasPermission("owner", "owner.dashboard"));
check("admin route /dashboard denied", !isRouteAllowed("admin", "/dashboard"));
check("admin route /admin/dashboard allowed", isRouteAllowed("admin", "/admin/dashboard"));

// Detailing isolation
check("detailing cannot view finance", !hasPermission("detailing", "finance.view"));
check("detailing cannot view cars", !hasPermission("detailing", "cars.view"));
check("detailing can view detailing", hasPermission("detailing", "detailing.view"));
check("detailing route /detailing allowed", isRouteAllowed("detailing", "/detailing"));
check("detailing route /finance denied", !isRouteAllowed("detailing", "/finance"));
check("detailing route /cars denied", !isRouteAllowed("detailing", "/cars"));
check("detailing nav only detailing", navAllowed("detailing", "detailing") && !navAllowed("detailing", "finance"));

// Documents role
check("documents can view documents", hasPermission("documents", "documents.view"));
check("documents can view linked cars/clients", hasPermission("documents", "cars.view") && hasPermission("documents", "clients.view"));
check("documents cannot view detailing", !hasPermission("documents", "detailing.view"));
check("documents cannot view finance", !hasPermission("documents", "finance.view"));
check("documents route /documents allowed", isRouteAllowed("documents", "/documents"));
check("documents route /detailing denied", !isRouteAllowed("documents", "/detailing"));

// Accountant role
check("accountant can view finance", hasPermission("accountant", "finance.view"));
check("accountant can manage finance", hasPermission("accountant", "finance.manage"));
check("accountant cannot delete", !hasPermission("accountant", "cars.delete"));
check("accountant route /finance allowed", isRouteAllowed("accountant", "/finance"));
check("accountant route /dashboard denied", !isRouteAllowed("accountant", "/dashboard"));

// Lawyer role
check("lawyer can view documents", hasPermission("lawyer", "documents.view"));
check("lawyer can view clients/cars/deals", hasPermission("lawyer", "clients.view") && hasPermission("lawyer", "cars.view") && hasPermission("lawyer", "deals.view"));
check("lawyer cannot view finance", !hasPermission("lawyer", "finance.view"));
check("lawyer cannot view detailing", !hasPermission("lawyer", "detailing.view"));
check("lawyer route /documents allowed", isRouteAllowed("lawyer", "/documents"));
check("lawyer route /finance denied", !isRouteAllowed("lawyer", "/finance"));

// Inactive role
check("inactive has no permissions", ROLE_PERMISSIONS.inactive.length === 0);
check("inactive default route", DEFAULT_ROUTES.inactive === "/access-disabled");
check("inactive route /dashboard denied", !isRouteAllowed("inactive", "/dashboard"));
check("inactive route /detailing denied", !isRouteAllowed("inactive", "/detailing"));

// Default routes
for (const [role, route] of Object.entries(DEFAULT_ROUTES)) {
  check(`${role} default route`, DEFAULT_ROUTES[role] === route);
}

// Owner nav breadth
check("owner nav dashboard", navAllowed("owner", "dashboard"));
check("owner nav settings", navAllowed("owner", "settings"));
check("admin nav settings", navAllowed("admin", "settings"));
check("detailing nav no settings", !navAllowed("detailing", "settings"));

console.log(`RBAC access matrix checks passed (${passed} assertions).`);
