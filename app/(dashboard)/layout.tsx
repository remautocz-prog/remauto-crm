import { DesktopSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { getCurrentUser } from "@/lib/queries/dashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black">
      <DesktopSidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <TopNav
          email={user.email ?? "user@remauto.com"}
          avatarUrl={user.user_metadata?.avatar_url}
        />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
