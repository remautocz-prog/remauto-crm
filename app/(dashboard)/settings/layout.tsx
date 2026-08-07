import { requireActiveAccount } from "@/lib/auth/page-guard";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireActiveAccount();
  return children;
}
