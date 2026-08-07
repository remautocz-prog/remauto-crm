import "server-only";

import { getTranslations } from "next-intl/server";
import {
  canPermanentlyDelete,
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import { getCurrentUserAccess } from "@/lib/auth/access";
import type { UserAccess } from "@/lib/auth/types";
import type { ActionResult } from "@/lib/utils/errors";

type PermissionDeniedResult = Extract<ActionResult<never>, { success: false }>;

export async function getPermissionDeniedMessage(): Promise<string> {
  const t = await getTranslations("access");
  return t("permissionDenied");
}

export async function getOwnerOnlyDeleteMessage(): Promise<string> {
  const t = await getTranslations("access");
  return t("ownerOnlyDelete");
}

export async function guardAuthenticated(): Promise<
  PermissionDeniedResult | UserAccess
> {
  const access = await getCurrentUserAccess();
  if (!access) {
    return { success: false, error: await getPermissionDeniedMessage() };
  }
  if (!access.isActive) {
    return { success: false, error: await getPermissionDeniedMessage() };
  }
  return access;
}

export async function guardPermission<T = undefined>(
  permission: Permission
): Promise<PermissionDeniedResult | null> {
  const access = await guardAuthenticated();
  if ("success" in access && access.success === false) {
    return access;
  }
  const userAccess = access as UserAccess;
  if (!hasPermission(userAccess.role, permission)) {
    return { success: false, error: await getPermissionDeniedMessage() };
  }
  return null;
}

export async function guardPermanentDelete(): Promise<PermissionDeniedResult | null> {
  const access = await guardAuthenticated();
  if ("success" in access && access.success === false) {
    return access;
  }
  const userAccess = access as UserAccess;
  if (!canPermanentlyDelete(userAccess.role)) {
    return { success: false, error: await getOwnerOnlyDeleteMessage() };
  }
  return null;
}

export async function requireActionPermission(
  permission: Permission
): Promise<UserAccess> {
  const denied = await guardPermission(permission);
  if (denied) {
    throw new Error(denied.error);
  }
  const access = await getCurrentUserAccess();
  if (!access?.isActive) {
    throw new Error(await getPermissionDeniedMessage());
  }
  return access;
}
