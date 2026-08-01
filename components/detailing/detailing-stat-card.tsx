"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DetailingStatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  iconAccent?: string;
  href?: string;
  onClick?: () => void;
};

export function DetailingStatCard({
  label,
  value,
  icon: Icon,
  accent,
  iconAccent = "text-zinc-500",
  href,
  onClick,
}: DetailingStatCardProps) {
  const className = cn(
    "block min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors",
    (href || onClick) && "hover:border-zinc-600 hover:bg-zinc-900/80 cursor-pointer",
    accent
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tabular-nums tracking-tight text-white">
            {value}
          </p>
        </div>
        <div className={cn("rounded-lg bg-zinc-800/80 p-2", iconAccent)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, "text-left w-full")}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
