import { DetailingSubnav } from "@/components/detailing/detailing-subnav";

export default function DetailingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <DetailingSubnav />
      {children}
    </div>
  );
}
