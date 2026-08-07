import { getDetailingNavKeysForRole } from "@/lib/auth/navigation";
import { requirePageAccess } from "@/lib/auth/page-guard";
import { DetailingSubnav } from "@/components/detailing/detailing-subnav";

export default async function DetailingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requirePageAccess("detailing.view");
  const allowedNavKeys = getDetailingNavKeysForRole(access.role);

  return (
    <div className="space-y-6">
      <DetailingSubnav allowedNavKeys={allowedNavKeys} />
      {children}
    </div>
  );
}
