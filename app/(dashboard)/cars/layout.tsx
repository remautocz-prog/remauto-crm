import { requirePageAccess } from "@/lib/auth/page-guard";

export default async function CarsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("cars.view");
  return children;
}
