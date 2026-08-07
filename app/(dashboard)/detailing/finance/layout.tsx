import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function DetailingFinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("detailing.finance.view");
  return children;
}
