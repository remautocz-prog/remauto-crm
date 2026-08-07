import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("admin.dashboard");
  return children;
}
