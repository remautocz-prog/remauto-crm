import {
  getAccessDeniedRedirect,
  requireAuthenticatedAccess,
} from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAuthenticatedAccess();

  if (!hasPermission(access.role, "owner.dashboard")) {
    if (hasPermission(access.role, "admin.dashboard")) {
      redirect("/admin/dashboard");
    }
    redirect(getAccessDeniedRedirect(access));
  }

  return children;
}
