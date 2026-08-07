import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function DetailingExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("detailing.expenses.manage");
  return children;
}
