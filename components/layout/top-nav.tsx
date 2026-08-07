import { MobileSidebar } from "@/components/layout/app-sidebar";
import { LanguageSelector } from "@/components/layout/language-selector";
import { UserNav } from "@/components/layout/user-nav";
import { getTranslations } from "next-intl/server";
import type { NavItem } from "@/lib/navigation";

type TopNavProps = {
  email: string;
  avatarUrl?: string | null;
  navItems: NavItem[];
  homeHref?: string;
  canManageUsers?: boolean;
  canViewSettings?: boolean;
};

export async function TopNav({
  email,
  avatarUrl,
  navItems,
  homeHref = "/dashboard",
  canManageUsers = false,
  canViewSettings = true,
}: TopNavProps) {
  const t = await getTranslations("app");

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileSidebar navItems={navItems} homeHref={homeHref} />
        <div>
          <h1 className="text-lg font-semibold text-white">{t("name")}</h1>
          <p className="hidden text-xs text-zinc-500 sm:block">{t("tagline")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSelector />
        <UserNav
          email={email}
          avatarUrl={avatarUrl}
          canManageUsers={canManageUsers}
          canViewSettings={canViewSettings}
        />
      </div>
    </header>
  );
}
