"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { canAssignRole, canModifyUser } from "@/lib/auth/permissions";
import { guardPermission } from "@/lib/auth/action-guard";
import { APP_ROLES, isAppRole, type AppRole } from "@/lib/auth/roles";
import type { UserAccess } from "@/lib/auth/types";
import { countActiveOwners, getProfileRole } from "@/lib/queries/users";
import {
  createAdminClient,
  getAuthCallbackUrl,
  hasAdminClient,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractErrorMessage } from "@/lib/utils/action-error-message";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

async function getActorAccess(): Promise<
  | { success: true; data: UserAccess }
  | { success: false; error: string; fieldErrors?: Partial<Record<string, string>> }
> {
  const denied = await guardPermission("users.view");
  if (denied) {
    return denied;
  }
  const { getCurrentUserAccess } = await import("@/lib/auth/access");
  const access = await getCurrentUserAccess();
  if (!access) {
    const t = await getTranslations("access");
    return { success: false, error: t("permissionDenied") };
  }
  return { success: true, data: access };
}

export async function updateUserRoleAction(input: {
  userId: string;
  role: AppRole;
}): Promise<ActionResult> {
  const t = await getTranslations("access");
  const denied = await guardPermission("users.manage_roles");
  if (denied) return denied;

  const accessResult = await getActorAccess();
  if (!accessResult.success) return accessResult;
  const access = accessResult.data;

  if (!isAppRole(input.role)) {
    return { success: false, error: t("invalidRole") };
  }

  if (input.userId === access.userId) {
    return { success: false, error: t("cannotChangeOwnRole") };
  }

  const targetRole = await getProfileRole(input.userId);
  if (!targetRole) {
    return { success: false, error: t("userNotFound") };
  }

  if (!canModifyUser(access.role, targetRole, input.userId, access.userId)) {
    return { success: false, error: t("permissionDenied") };
  }

  if (!canAssignRole(access.role, input.role)) {
    return { success: false, error: t("permissionDenied") };
  }

  if (targetRole === "owner" && input.role !== "owner") {
    const remainingOwners = await countActiveOwners(input.userId);
    if (remainingOwners === 0) {
      return { success: false, error: t("lastOwnerProtected") };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: input.role })
    .eq("id", input.userId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  try {
    const { syncDetailingEmployeeOnRoleChange } = await import(
      "@/lib/detailing/employee-sync"
    );
    await syncDetailingEmployeeOnRoleChange(input.userId, targetRole, input.role);
    revalidatePath("/detailing/employees");
    revalidatePath("/detailing/orders/new");
  } catch {
    // Detailing module may be unavailable; role change still succeeds.
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function updateUserActiveAction(input: {
  userId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const t = await getTranslations("access");
  const permission = input.isActive ? "users.update" : "users.deactivate";
  const denied = await guardPermission(permission);
  if (denied) return denied;

  const accessResult = await getActorAccess();
  if (!accessResult.success) return accessResult;
  const access = accessResult.data;

  if (input.userId === access.userId) {
    return { success: false, error: t("cannotChangeOwnRole") };
  }

  const targetRole = await getProfileRole(input.userId);
  if (!targetRole) {
    return { success: false, error: t("userNotFound") };
  }

  if (!canModifyUser(access.role, targetRole, input.userId, access.userId)) {
    return { success: false, error: t("permissionDenied") };
  }

  if (targetRole === "owner" && !input.isActive) {
    const remainingOwners = await countActiveOwners(input.userId);
    if (remainingOwners === 0) {
      return { success: false, error: t("lastOwnerProtected") };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: input.isActive })
    .eq("id", input.userId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function updateUserProfileAction(input: {
  userId: string;
  fullName: string;
  phone?: string | null;
}): Promise<ActionResult> {
  const denied = await guardPermission("users.update");
  if (denied) return denied;

  const accessResult = await getActorAccess();
  if (!accessResult.success) return accessResult;
  const access = accessResult.data;

  const targetRole = await getProfileRole(input.userId);
  if (!targetRole) {
    const t = await getTranslations("access");
    return { success: false, error: t("userNotFound") };
  }

  if (!canModifyUser(access.role, targetRole, input.userId, access.userId)) {
    const t = await getTranslations("access");
    return { success: false, error: t("permissionDenied") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName.trim() || null })
    .eq("id", input.userId);

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  if (input.phone !== undefined) {
    const admin = createAdminClient();
    if (!admin) {
      const t = await getTranslations("access");
      return { success: false, error: t("inviteRequiresServiceRole") };
    }

    const phoneValue = input.phone?.trim() || null;
    const { data: existingAuth, error: readError } = await admin.auth.admin.getUserById(
      input.userId
    );
    if (readError) {
      return { success: false, error: extractErrorMessage(readError) };
    }

    const existingMeta =
      (existingAuth.user?.user_metadata as Record<string, unknown> | undefined) ?? {};

    const { error: authError } = await admin.auth.admin.updateUserById(input.userId, {
      phone: phoneValue ?? undefined,
      user_metadata: {
        ...existingMeta,
        phone: phoneValue,
        full_name: input.fullName.trim() || existingMeta.full_name || null,
      },
    });

    if (authError) {
      return { success: false, error: extractErrorMessage(authError) };
    }
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function inviteManagedUserAction(input: {
  email: string;
  fullName: string;
  phone?: string | null;
  role: AppRole;
}): Promise<ActionResult<{ userId: string }>> {
  const t = await getTranslations("access");

  try {
    const denied = await guardPermission("users.create");
    if (denied) {
      return denied;
    }

    const accessResult = await getActorAccess();
    if (!accessResult.success) {
      return accessResult;
    }
    const access = accessResult.data;

    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false, error: t("inviteInvalidEmail") };
    }

    if (!isAppRole(input.role) || input.role === "owner") {
      return { success: false, error: t("invalidRole") };
    }

    if (!canAssignRole(access.role, input.role)) {
      return { success: false, error: t("permissionDenied") };
    }

    const admin = createAdminClient();
    if (!admin) {
      return { success: false, error: t("inviteRequiresServiceRole") };
    }

    const redirectTo = getAuthCallbackUrl("/auth/callback");

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        password_set: false,
      },
      redirectTo,
    });

    if (error || !data.user) {
      const errorMessage = error
        ? extractErrorMessage(error)
        : "Supabase Auth inviteUserByEmail returned no user.";
      return { success: false, error: errorMessage };
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        full_name: input.fullName.trim() || null,
        role: input.role,
        is_active: true,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      const errorMessage = await formatSupabaseError(profileError);
      return { success: false, error: errorMessage };
    }

    if (input.role === "detailing") {
      try {
        const { ensureDetailingEmployeeSettings } = await import(
          "@/lib/detailing/employee-sync"
        );
        await ensureDetailingEmployeeSettings(data.user.id, { reactivate: true });
        revalidatePath("/detailing/employees");
        revalidatePath("/detailing/orders/new");
      } catch {
        // Detailing module may be unavailable; invite still succeeds.
      }
    }

    revalidatePath("/settings/users");
    return { success: true, data: { userId: data.user.id } };
  } catch (error) {
    const message = extractErrorMessage(error);
    return { success: false, error: message };
  }
}

export async function resendManagedUserInvitationAction(input: {
  userId: string;
}): Promise<ActionResult> {
  const t = await getTranslations("access");
  const denied = await guardPermission("users.create");
  if (denied) return denied;

  const accessResult = await getActorAccess();
  if (!accessResult.success) return accessResult;
  const access = accessResult.data;

  const targetRole = await getProfileRole(input.userId);
  if (!targetRole) {
    return { success: false, error: t("userNotFound") };
  }

  if (!canModifyUser(access.role, targetRole, input.userId, access.userId)) {
    return { success: false, error: t("permissionDenied") };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: t("inviteRequiresServiceRole") };
  }

  const { data: authUser, error: readError } = await admin.auth.admin.getUserById(
    input.userId
  );
  if (readError || !authUser.user?.email) {
    return { success: false, error: readError?.message ?? t("userNotFound") };
  }

  if (authUser.user.last_sign_in_at) {
    return { success: false, error: t("permissionDenied") };
  }

  const metadata =
    (authUser.user.user_metadata as Record<string, unknown> | undefined) ?? {};

  const { error } = await admin.auth.admin.inviteUserByEmail(authUser.user.email, {
    data: {
      ...metadata,
      password_set: false,
    },
    redirectTo: getAuthCallbackUrl("/auth/callback"),
  });

  if (error) {
    return { success: false, error: extractErrorMessage(error) };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function getAssignableRolesAction(): Promise<ActionResult<AppRole[]>> {
  const denied = await guardPermission("users.view");
  if (denied) return denied;

  const accessResult = await getActorAccess();
  if (!accessResult.success) return accessResult;
  const access = accessResult.data;

  const roles = APP_ROLES.filter(
    (role) => role !== "inactive" && canAssignRole(access.role, role)
  );
  return { success: true, data: roles };
}

export async function getUserManagementCapabilitiesAction(): Promise<
  ActionResult<{
    canManageRoles: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDeactivate: boolean;
    hasServiceRole: boolean;
  }>
> {
  const denied = await guardPermission("users.view");
  if (denied) return denied;

  const accessResult = await getActorAccess();
  if (!accessResult.success) return accessResult;
  const access = accessResult.data;

  return {
    success: true,
    data: {
      canManageRoles: access.permissions.has("users.manage_roles"),
      canCreate: access.permissions.has("users.create"),
      canUpdate: access.permissions.has("users.update"),
      canDeactivate: access.permissions.has("users.deactivate"),
      hasServiceRole: hasAdminClient(),
    },
  };
}
