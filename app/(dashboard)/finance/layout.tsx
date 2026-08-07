import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("finance.view");
  return children;
}
