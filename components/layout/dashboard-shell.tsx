import Link from "next/link";
import { DesktopSidebar, MobileSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import type { AppRole } from "@/lib/auth/roles";
import { getDefaultRouteForRole } from "@/lib/auth/roles";
import type { NavItem } from "@/lib/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  email: string;
  avatarUrl?: string;
  navItems: NavItem[];
  role: AppRole;
  canManageUsers: boolean;
  canViewSettings: boolean;
};

export function DashboardShell({
  children,
  email,
  avatarUrl,
  navItems,
  role,
  canManageUsers,
  canViewSettings,
}: DashboardShellProps) {
  const homeHref = getDefaultRouteForRole(role);

  return (
    <div className="min-h-screen bg-black">
      <DesktopSidebar navItems={navItems} homeHref={homeHref} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <TopNav
          email={email}
          avatarUrl={avatarUrl}
          navItems={navItems}
          homeHref={homeHref}
          canManageUsers={canManageUsers}
          canViewSettings={canViewSettings}
        />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export { MobileSidebar, DesktopSidebar };
