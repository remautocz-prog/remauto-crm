import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function DetailingEmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("users.view");
  return children;
}
