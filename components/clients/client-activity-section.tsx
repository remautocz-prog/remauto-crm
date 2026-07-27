"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Archive,
  Car,
  FileText,
  MessageSquare,
  Pencil,
  Receipt,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { ClientActivityItem } from "@/lib/types/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

const ICONS: Partial<Record<ClientActivityItem["kind"], typeof Car>> = {
  client_created: UserPlus,
  client_updated: Pencil,
  client_archived: Archive,
  client_unarchived: Archive,
  car_added: Car,
  car_sold: Car,
  document_created: FileText,
  document_completed: FileText,
  document_status_changed: FileText,
  document_payment_marked: Receipt,
  detailing_created: Sparkles,
  detailing_completed: Sparkles,
  payment_registered: Receipt,
  note_added: MessageSquare,
};

type ClientActivitySectionProps = {
  items: ClientActivityItem[];
};

export function ClientActivitySection({ items }: ClientActivitySectionProps) {
  const t = useTranslations("clients");
  const { formatDateTime } = useFormatters();

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("activityTimeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("noActivity")}</p>
        ) : (
          <ol className="space-y-4">
            {items.map((item) => {
              const Icon = ICONS[item.kind] ?? FileText;
              return (
                <li
                  key={item.id}
                  className="flex gap-4 border-b border-zinc-800/80 pb-4 last:border-0 last:pb-0"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
                    <Icon className="h-4 w-4" />
                  </div>
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
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
