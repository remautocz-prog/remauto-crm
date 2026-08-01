"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DetailingPageHeaderProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
};

export function DetailingPageHeader({
  title,
  description,
  action,
  secondaryAction,
  className,
}: DetailingPageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
      </div>
      {(action || secondaryAction) && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {secondaryAction ? (
            <Button asChild variant="outline" size="lg">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
          {action ? (
            <Button asChild size="lg" className="min-w-[10rem]">
              <Link href={action.href}>
                {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
                {action.label}
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
