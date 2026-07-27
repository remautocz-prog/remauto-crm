"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ClientActivityItem } from "@/lib/types/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type ClientActivitySectionProps = {
  items: ClientActivityItem[];
};

export function ClientActivitySection({ items }: ClientActivitySectionProps) {
  const t = useTranslations("clients.activity");
  const { formatDateTime } = useFormatters();

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("empty")}</p>
        ) : (
          <ol className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 border-b border-zinc-800/80 pb-4 last:border-0 last:pb-0"
              >
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link href={item.href} className="font-medium text-white hover:text-red-400">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="font-medium text-white">{item.title}</p>
                  )}
                  {item.subtitle ? (
                    <p className="mt-1 text-sm text-zinc-400">{item.subtitle}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDateTime(item.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
