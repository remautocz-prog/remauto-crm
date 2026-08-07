import { getCurrentUserAccess } from "@/lib/auth/access";
import { getNavItemsForRole } from "@/lib/auth/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentUserAccess();

  if (!access) {
    redirect("/login");
  }

  if (!access.isActive) {
    redirect("/access-disabled");
  }

  const activeAccess = access;
  const navItems = getNavItemsForRole(activeAccess.role);

  return (
    <DashboardShell
      email={activeAccess.email ?? "user@remauto.com"}
      avatarUrl={undefined}
      navItems={navItems}
      role={activeAccess.role}
      canManageUsers={activeAccess.permissions.has("users.view")}
      canViewSettings={activeAccess.permissions.has("settings.view")}
    >
      {children}
    </DashboardShell>
  );
}
