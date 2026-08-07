import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("documents.view");
  return children;
}
