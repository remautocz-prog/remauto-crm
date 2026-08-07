import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function SettingsTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("settings.manage");
  return children;
}
