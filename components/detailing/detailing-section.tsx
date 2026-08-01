"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DetailingSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function DetailingSection({
  title,
  description,
  action,
  children,
  className,
  noPadding,
}: DetailingSectionProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn(noPadding && "p-0 pt-0")}>{children}</CardContent>
    </Card>
  );
}

type DetailingTableProps = {
  headers: string[];
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
};

export function DetailingTable({ headers, children, emptyMessage, isEmpty }: DetailingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-950/50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">{children}</tbody>
      </table>
      {isEmpty && emptyMessage ? (
        <p className="px-4 py-10 text-center text-sm text-zinc-500">{emptyMessage}</p>
      ) : null}
    </div>
  );
}
