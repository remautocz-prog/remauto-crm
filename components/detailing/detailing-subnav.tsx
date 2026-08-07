"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DetailingNavKey } from "@/lib/auth/navigation";

const links: Array<{
  href: string;
  key: DetailingNavKey;
  exact?: boolean;
  highlight?: boolean;
}> = [
  { href: "/detailing", key: "dashboard", exact: true },
  { href: "/detailing/orders", key: "orders" },
  { href: "/detailing/orders/new", key: "newOrder", highlight: true },
  { href: "/detailing/finance", key: "finance" },
  { href: "/detailing/expenses", key: "expenses" },
  { href: "/detailing/employees", key: "employees" },
  { href: "/detailing/services", key: "services" },
];

export function DetailingSubnav({
  allowedNavKeys,
}: {
  allowedNavKeys: DetailingNavKey[];
}) {
  const pathname = usePathname();
  const t = useTranslations("detailing.nav");
  const visibleLinks = links.filter((link) => allowedNavKeys.includes(link.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{t("moduleTitle")}</p>
          <p className="text-sm text-zinc-500">{t("moduleDescription")}</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1.5">
        {visibleLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : link.href === "/detailing/orders"
              ? pathname === link.href ||
                (pathname.startsWith("/detailing/orders/") &&
                  !pathname.startsWith("/detailing/orders/new"))
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-red-600 text-white shadow-sm"
                  : link.highlight
                    ? "text-red-400 hover:bg-red-600/10 hover:text-red-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              {t(link.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
