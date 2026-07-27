"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search } from "lucide-react";
import type { Client } from "@/lib/types/clients";
import {
  CLIENT_SORT_VALUES,
  CLIENT_TYPE_VALUES,
  type ClientSortValue,
} from "@/lib/constants/clients";
import { getClientDisplayName } from "@/lib/clients/validation";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateClientType, translatePreferredLanguage } from "@/lib/i18n/clients";

const SORT_LABEL_KEYS: Record<
  ClientSortValue,
  "newest" | "name" | "company" | "lastActivity"
> = {
  newest: "newest",
  name: "name",
  company: "company",
  last_activity: "lastActivity",
};

type ClientsListProps = {
  clients: Client[];
  countries: string[];
  initialQuery: string;
  initialClientType: string;
  initialCountry: string;
  initialPreferredLanguage: string;
  initialSort: string;
  initialShowArchived: boolean;
};

export function ClientsList({
  clients,
  countries,
  initialQuery,
  initialClientType,
  initialCountry,
  initialPreferredLanguage,
  initialSort,
  initialShowArchived,
}: ClientsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [clientType, setClientType] = useState(initialClientType);
  const [country, setCountry] = useState(initialCountry);
  const [preferredLanguage, setPreferredLanguage] = useState(initialPreferredLanguage);
  const [sort, setSort] = useState(initialSort);
  const [showArchived, setShowArchived] = useState(initialShowArchived);

  const t = useTranslations("clients");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tSort = useTranslations("clients.sort");
  const tClientType = useTranslations("clientType");
  const tPreferredLanguage = useTranslations("preferredLanguage");
  const tCommon = useTranslations("common");
  const { formatDate } = useFormatters();
  const dash = tCommon("dash");

  function applyFilters(next: Partial<{
    q: string;
    client_type: string;
    country: string;
    preferred_language: string;
    sort: string;
    show_archived: boolean;
  }>) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const nextType = next.client_type ?? clientType;
    const nextCountry = next.country ?? country;
    const nextLanguage = next.preferred_language ?? preferredLanguage;
    const nextSort = next.sort ?? sort;
    const nextShowArchived = next.show_archived ?? showArchived;

    if (q.trim()) params.set("q", q.trim());
    if (nextType && nextType !== "all") params.set("client_type", nextType);
    if (nextCountry && nextCountry !== "all") params.set("country", nextCountry);
    if (nextLanguage && nextLanguage !== "all") {
      params.set("preferred_language", nextLanguage);
    }
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);
    if (nextShowArchived) params.set("show_archived", "1");

    startTransition(() => {
      router.push(`/clients${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        initialQuery ||
          (initialClientType && initialClientType !== "all") ||
          (initialCountry && initialCountry !== "all") ||
          (initialPreferredLanguage && initialPreferredLanguage !== "all") ||
          (initialSort && initialSort !== "newest") ||
          initialShowArchived
      ),
    [
      initialClientType,
      initialCountry,
      initialPreferredLanguage,
      initialQuery,
      initialSort,
      initialShowArchived,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
          <p className="text-zinc-400">{t("description")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addClient")}
        </Button>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-zinc-400">{tActions("search")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: query })}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{tFields("clientType")}</label>
            <Select
              value={clientType}
              onValueChange={(value) => {
                setClientType(value);
                applyFilters({ client_type: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                {CLIENT_TYPE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateClientType(tClientType, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{tFields("country")}</label>
            <Select
              value={country}
              onValueChange={(value) => {
                setCountry(value);
                applyFilters({ country: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("allCountries")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCountries")}</SelectItem>
                {countries.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{tFields("preferredLanguage")}</label>
            <Select
              value={preferredLanguage}
              onValueChange={(value) => {
                setPreferredLanguage(value);
                applyFilters({ preferred_language: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("allLanguages")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allLanguages")}</SelectItem>
                <SelectItem value="ru">{translatePreferredLanguage(tPreferredLanguage, "ru")}</SelectItem>
                <SelectItem value="cs">{translatePreferredLanguage(tPreferredLanguage, "cs")}</SelectItem>
                <SelectItem value="en">{translatePreferredLanguage(tPreferredLanguage, "en")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{tFields("sort")}</label>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                applyFilters({ sort: value });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_SORT_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tSort(SORT_LABEL_KEYS[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:col-span-2 xl:col-span-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => {
                  setShowArchived(e.target.checked);
                  applyFilters({ show_archived: e.target.checked });
                }}
              />
              {t("showArchived")}
            </label>
            <Button variant="secondary" onClick={() => applyFilters({ q: query })} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("applyFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : null}

      {clients.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-white">
              {hasFilters ? t("notFound") : t("empty")}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {hasFilters ? t("notFoundHint") : t("emptyHint")}
            </p>
            {!hasFilters ? (
              <Button className="mt-6" onClick={() => setCreateOpen(true)}>
                {t("addClient")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zinc-800 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{tFields("name")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("clientType")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("company")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("phone")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("email")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("country")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("preferredLanguage")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("created")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-t border-zinc-800/80 hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-white hover:text-red-400"
                      >
                        {getClientDisplayName(client)}
                      </Link>
                      {!client.is_active ? (
                        <span className="ml-2 text-xs text-zinc-500">{t("archivedBadge")}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {translateClientType(tClientType, client.client_type)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{client.company ?? dash}</td>
                    <td className="px-4 py-3 text-zinc-300">{client.phone ?? dash}</td>
                    <td className="px-4 py-3 text-zinc-300">{client.email ?? dash}</td>
                    <td className="px-4 py-3 text-zinc-300">{client.country ?? dash}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {client.preferred_language
                        ? translatePreferredLanguage(tPreferredLanguage, client.preferred_language)
                        : dash}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {formatDate(client.created_at, dash)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {clients.map((client) => (
              <Card key={client.id} className="border-zinc-800 bg-zinc-900/60">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    <Link href={`/clients/${client.id}`} className="hover:text-red-400">
                      {getClientDisplayName(client)}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-zinc-300">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">{tFields("clientType")}</span>
                    <span>{translateClientType(tClientType, client.client_type)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">{tFields("phone")}</span>
                    <span>{client.phone ?? dash}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">{tFields("email")}</span>
                    <span>{client.email ?? dash}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">{tFields("country")}</span>
                    <span>{client.country ?? dash}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ClientFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
    </div>
  );
}
