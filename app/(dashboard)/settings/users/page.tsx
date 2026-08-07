import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-shell";
import { UsersManager } from "@/components/settings/users-manager";
import { Button } from "@/components/ui/button";
import { getCurrentUserAccess } from "@/lib/auth/access";
import { APP_ROLES } from "@/lib/auth/roles";
import { canAssignRole } from "@/lib/auth/permissions";
import { listManagedUsers } from "@/lib/queries/users";
import { hasAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("access");
  return { title: t("employees") };
}

export default async function SettingsUsersPage() {
  const [access, users, t, tActions] = await Promise.all([
    getCurrentUserAccess(),
    listManagedUsers(),
    getTranslations("access"),
    getTranslations("actions"),
  ]);

  if (!access) {
    redirect("/login");
  }

  const assignableRoles = APP_ROLES.filter(
    (role) => role !== "inactive" && canAssignRole(access.role, role)
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
        <Link href="/settings">
          <ArrowLeft className="h-4 w-4" />
          {tActions("backToList")}
        </Link>
      </Button>
      <PageHeader title={t("employees")} description={t("employeesDescription")} />
      <UsersManager
        users={users}
        assignableRoles={assignableRoles}
        canManageRoles={access.permissions.has("users.manage_roles")}
        canCreate={access.permissions.has("users.create")}
        canUpdate={access.permissions.has("users.update")}
        canDeactivate={access.permissions.has("users.deactivate")}
        hasServiceRole={hasAdminClient()}
        currentUserId={access.userId}
      />
    </div>
  );
}
