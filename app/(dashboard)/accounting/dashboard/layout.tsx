import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function AccountantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("accounting.dashboard");
  return children;
}
