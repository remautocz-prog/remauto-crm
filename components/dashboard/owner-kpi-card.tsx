"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type OwnerKpiTone =
  | "profit"
  | "cars"
  | "commission"
  | "documents"
  | "detailing"
  | "attention";

const TONE_STYLES: Record<
  OwnerKpiTone,
  { border: string; glow: string; icon: string; hint: string }
> = {
  profit: {
    border: "border-emerald-500/25",
    glow: "bg-gradient-to-br from-emerald-950/40 via-zinc-900/70 to-zinc-950/80",
    icon: "bg-emerald-500/15 text-emerald-300",
    hint: "text-emerald-200/70",
  },
  cars: {
    border: "border-sky-500/25",
    glow: "bg-gradient-to-br from-sky-950/35 via-zinc-900/70 to-zinc-950/80",
    icon: "bg-sky-500/15 text-sky-300",
    hint: "text-sky-200/70",
  },
  commission: {
    border: "border-violet-500/25",
    glow: "bg-gradient-to-br from-violet-950/35 via-zinc-900/70 to-zinc-950/80",
    icon: "bg-violet-500/15 text-violet-300",
    hint: "text-violet-200/70",
  },
  documents: {
    border: "border-cyan-500/25",
    glow: "bg-gradient-to-br from-cyan-950/35 via-zinc-900/70 to-zinc-950/80",
    icon: "bg-cyan-500/15 text-cyan-300",
    hint: "text-cyan-200/70",
  },
  detailing: {
    border: "border-orange-500/25",
    glow: "bg-gradient-to-br from-orange-950/35 via-zinc-900/70 to-zinc-950/80",
    icon: "bg-orange-500/15 text-orange-300",
    hint: "text-orange-200/70",
  },
  attention: {
    border: "border-amber-500/30",
    glow: "bg-gradient-to-br from-amber-950/35 via-zinc-900/70 to-zinc-950/80",
    icon: "bg-amber-500/15 text-amber-300",
    hint: "text-amber-200/70",
  },
};

type OwnerKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: OwnerKpiTone;
  href?: string;
  onClick?: () => void;
};

export function OwnerKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
  onClick,
}: OwnerKpiCardProps) {
  const styles = TONE_STYLES[tone];
  const className = cn(
    "group block min-w-0 rounded-2xl border p-4 transition-colors sm:p-5",
    styles.border,
    styles.glow,
    (href || onClick) &&
      "cursor-pointer hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className={cn("mt-1 text-xs", styles.hint)}>{hint}</p>
          ) : null}
        </div>
        <div className={cn("rounded-xl p-2.5", styles.icon)}>
          <Icon className="h-5 w-5" aria-hidden />
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
      <button type="button" onClick={onClick} className={cn(className, "w-full text-left")}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
