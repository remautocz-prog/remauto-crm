import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("reports.view");
  return children;
}
