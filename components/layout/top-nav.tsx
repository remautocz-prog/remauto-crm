import { MobileSidebar } from "@/components/layout/app-sidebar";
import { UserNav } from "@/components/layout/user-nav";

type TopNavProps = {
  email: string;
  avatarUrl?: string | null;
};

export function TopNav({ email, avatarUrl }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <div>
          <h1 className="text-lg font-semibold text-white">RemAuto CRM</h1>
          <p className="hidden text-xs text-zinc-500 sm:block">
            Automotive business management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UserNav email={email} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
