"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search } from "lucide-react";
import type { Profile } from "@/lib/types/cars";
import type { DealWithRelations } from "@/lib/types/deals";
import {
  DEAL_PAYMENT_STATUSES,
  DEAL_STATUSES,
} from "@/lib/constants/deals";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getClientLabelFromSnapshot, getVehicleLabelFromSnapshot } from "@/lib/deals/snapshots";
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

type DealsListProps = {
  deals: DealWithRelations[];
  profiles: Profile[];
  initialQuery: string;
  initialStatus: string;
  initialPaymentStatus: string;
  initialPayer: string;
  initialAssignedTo: string;
  initialArchived: boolean;
  initialFilter: string;
};

export function DealsList({
  deals,
  profiles,
  initialQuery,
  initialStatus,
  initialPaymentStatus,
  initialPayer,
  initialAssignedTo,
  initialArchived,
  initialFilter,
}: DealsListProps) {
  const t = useTranslations("deals");
  const tStatus = useTranslations("deals.status");
  const tPayment = useTranslations("deals.paymentStatuses");
  const tPayer = useTranslations("deals.payer");
  const router = useRouter();
  const { formatCurrency, formatDate } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [payer, setPayer] = useState(initialPayer);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo);
  const [archived, setArchived] = useState(initialArchived);

  function applyFilters() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (payer) params.set("payer", payer);
    if (assignedTo) params.set("assigned_to", assignedTo);
    if (archived) params.set("archived", "1");
    if (initialFilter) params.set("filter", initialFilter);
    startTransition(() => router.push(`/deals?${params.toString()}`));
  }

  const title = useMemo(() => {
    if (initialFilter === "active") return t("activeDeals");
    if (initialFilter === "awaiting_payment") return t("awaitingPayment");
    if (initialFilter === "overdue") return t("overduePayments");
    if (initialFilter === "handovers_today") return t("handoversToday");
    if (initialFilter === "completed_month") return t("completedThisMonth");
    return t("deals");
  }, [initialFilter, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-zinc-400">{deals.length} {t("deals").toLowerCase()}</p>
        </div>
        <Button asChild>
          <Link href="/deals/new">
            <Plus className="h-4 w-4" />
            {t("newDeal")}
          </Link>
        </Button>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative md:col-span-2 xl:col-span-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("dealStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {DEAL_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{tStatus(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus || "all"} onValueChange={(v) => setPaymentStatus(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("paymentStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPaymentStatuses")}</SelectItem>
              {DEAL_PAYMENT_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{tPayment(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignedTo || "all"} onValueChange={(v) => setAssignedTo(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("assignedEmployee")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allEmployees")}</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name ?? profile.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            {t("showArchived")}
          </label>
          <Button onClick={applyFilters} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("applyFilters")}
          </Button>
        </CardContent>
      </Card>

      {deals.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="py-10 text-center text-sm text-zinc-400">
            {t("noDeals")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const clientLabel = deal.client
              ? getClientDisplayName({
                  full_name: deal.client.full_name,
                  company: deal.client.company,
                  client_type: (deal.client.client_type as "individual" | "company") ?? "individual",
                })
              : getClientLabelFromSnapshot(deal.client_snapshot);
            const vehicleA = deal.vehicle_a
              ? `${deal.vehicle_a.brand} ${deal.vehicle_a.model}`
              : getVehicleLabelFromSnapshot(deal.vehicle_a_snapshot);
            const vehicleB = deal.vehicle_b
              ? `${deal.vehicle_b.brand} ${deal.vehicle_b.model}`
              : getVehicleLabelFromSnapshot(deal.vehicle_b_snapshot);

            return (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{deal.deal_number}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {tStatus(deal.status)}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {tPayment(deal.payment_status)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{clientLabel}</p>
                    <p className="text-xs text-zinc-500">
                      {t("vehicleA")}: {vehicleA} · {t("vehicleB")}: {vehicleB}
                    </p>
                  </div>
                  <div className="text-sm text-zinc-400 lg:text-right">
                    <p>
                      {t("additionalPayment")}:{" "}
                      {deal.additional_payment
                        ? `${formatCurrency(deal.additional_payment)} ${deal.currency}`
                        : t("noAdditionalPayment")}
                    </p>
                    {deal.additional_payment_payer ? (
                      <p>{tPayer(deal.additional_payment_payer)}</p>
                    ) : null}
                    {deal.signing_date ? (
                      <p>{t("signingDate")}: {formatDate(deal.signing_date)}</p>
                    ) : null}
                    <p className="text-xs text-zinc-500">
                      {deal.assignee?.full_name ?? t("unassigned")} · {formatDate(deal.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
