import type { AppRole } from "@/lib/auth/roles";

export const PERMISSIONS = [
  "owner.dashboard",
  "admin.dashboard",
  "accounting.dashboard",
  "cars.view",
  "cars.create",
  "cars.update",
  "cars.archive",
  "cars.delete",
  "clients.view",
  "clients.create",
  "clients.update",
  "clients.archive",
  "clients.delete",
  "documents.view",
  "documents.create",
  "documents.update",
  "documents.archive",
  "documents.delete",
  "detailing.view",
  "detailing.create",
  "detailing.update",
  "detailing.payment.update",
  "detailing.finance.view",
  "detailing.expenses.manage",
  "detailing.delete",
  "finance.view",
  "finance.manage",
  "users.view",
  "users.create",
  "users.update",
  "users.manage_roles",
  "users.deactivate",
  "users.delete",
  "settings.view",
  "settings.manage",
  "deals.view",
  "deals.create",
  "deals.update",
  "deals.archive",
  "reports.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  owner: PERMISSIONS,
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
  detailing: [
    "detailing.view",
    "detailing.create",
    "detailing.update",
    "detailing.payment.update",
  ],
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
    "cars.update",
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

const PERMISSION_LOOKUP = Object.fromEntries(
  Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => [
    role,
    new Set(permissions),
  ])
) as Record<AppRole, Set<Permission>>;

export function hasPermission(role: AppRole, permission: Permission): boolean {
  if (!ALL_PERMISSIONS.has(permission)) return false;
  return PERMISSION_LOOKUP[role]?.has(permission) ?? false;
}

export function canPermanentlyDelete(role: AppRole): boolean {
  return role === "owner";
}

export function canManageRoles(role: AppRole): boolean {
  return role === "owner";
}

export function canAssignRole(actorRole: AppRole, targetRole: AppRole): boolean {
  if (actorRole === "owner") {
    return targetRole !== "owner" || true;
  }
  if (actorRole === "admin") {
    return !["owner", "admin"].includes(targetRole);
  }
  return false;
}

export function canModifyUser(
  actorRole: AppRole,
  targetRole: AppRole,
  targetUserId: string,
  actorUserId: string
): boolean {
  if (targetUserId === actorUserId) {
    return false;
  }
  if (targetRole === "owner") {
    return false;
  }
  if (actorRole === "owner") {
    return true;
  }
  if (actorRole === "admin") {
    return !["owner", "admin"].includes(targetRole);
  }
  return false;
}

export function listPermissionsForRole(role: AppRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
