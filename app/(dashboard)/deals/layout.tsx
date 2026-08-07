import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function DealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("deals.view");
  return children;
}
