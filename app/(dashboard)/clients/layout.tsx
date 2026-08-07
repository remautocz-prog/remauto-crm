import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("clients.view");
  return children;
}
