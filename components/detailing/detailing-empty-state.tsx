"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DetailingEmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  compact?: boolean;
  className?: string;
};

export function DetailingEmptyState({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  compact,
  className,
}: DetailingEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 text-center",
        compact ? "px-6 py-10" : "px-8 py-16",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 rounded-full bg-zinc-800 p-4">
          <Icon className="h-8 w-8 text-zinc-500" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-zinc-400">{description}</p> : null}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action ? (
            <Button asChild size="lg">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button asChild variant="outline" size="lg">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
