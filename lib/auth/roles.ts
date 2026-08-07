export const APP_ROLES = [
  "owner",
  "admin",
  "detailing",
  "documents",
  "accountant",
  "lawyer",
  "inactive",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const OPERATIONAL_ROLES = [
  "owner",
  "admin",
  "detailing",
  "documents",
  "accountant",
  "lawyer",
] as const satisfies readonly AppRole[];

export type OperationalRole = (typeof OPERATIONAL_ROLES)[number];

export const ROLE_LABEL_KEYS: Record<AppRole, string> = {
  owner: "roles.owner",
  admin: "roles.admin",
  detailing: "roles.detailing",
  documents: "roles.documents",
  accountant: "roles.accountant",
  lawyer: "roles.lawyer",
  inactive: "roles.inactive",
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function parseAppRole(
  value: string | null | undefined,
  fallback: AppRole = "inactive"
): AppRole {
  return isAppRole(value) ? value : fallback;
}

export function getDefaultRouteForRole(role: AppRole): string {
  switch (role) {
    case "owner":
      return "/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "detailing":
      return "/detailing";
    case "documents":
      return "/documents/dashboard";
    case "lawyer":
      return "/documents";
    case "accountant":
      return "/accounting/dashboard";
    case "inactive":
      return "/access-disabled";
    default:
      return "/access-disabled";
  }
}

export function getRoleModuleSummary(role: AppRole): string {
  switch (role) {
    case "owner":
      return "roles.modules.owner";
    case "admin":
      return "roles.modules.admin";
    case "detailing":
      return "roles.modules.detailing";
    case "documents":
      return "roles.modules.documents";
    case "accountant":
      return "roles.modules.accountant";
    case "lawyer":
      return "roles.modules.lawyer";
    case "inactive":
      return "roles.modules.inactive";
    default:
      return "roles.modules.inactive";
  }
}
