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
import { archiveDealAction } from "@/lib/actions/deals";
import { getClientDisplayName } from "@/lib/clients/validation";
import { getClientLabelFromSnapshot, getVehicleLabelFromSnapshot } from "@/lib/deals/snapshots";
import {
  DEAL_LIST_SEGMENTS,
  type DealListSegment,
} from "@/lib/deals/list-segment";
import { ArchivedBadge } from "@/components/shared/archived-badge";
import { OrderArchiveRowActions } from "@/components/shared/order-archive-row-actions";
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
  initialSegment: DealListSegment;
  initialFilter: string;
  canArchive: boolean;
  canRestoreArchived: boolean;
};

export function DealsList({
  deals,
  profiles,
  initialQuery,
  initialStatus,
  initialPaymentStatus,
  initialPayer,
  initialAssignedTo,
  initialSegment,
  initialFilter,
  canArchive,
  canRestoreArchived,
}: DealsListProps) {
  const t = useTranslations("deals");
  const tArchive = useTranslations("archive");
  const tStatus = useTranslations("deals.status");
  const tPayment = useTranslations("deals.paymentStatuses");
  const tPayer = useTranslations("deals.payer");
  const router = useRouter();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [payer, setPayer] = useState(initialPayer);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo);
  const [segment, setSegment] = useState<DealListSegment>(initialSegment);

  function applyFilters(nextSegment = segment) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (payer) params.set("payer", payer);
    if (assignedTo) params.set("assigned_to", assignedTo);
    if (nextSegment !== "active") params.set("segment", nextSegment);
    if (initialFilter) params.set("filter", initialFilter);
    startTransition(() => router.push(`/deals?${params.toString()}`));
  }

  const title = useMemo(() => {
    if (segment === "archived") return tArchive("archivedOrders");
    if (initialFilter === "active") return t("activeDeals");
    if (initialFilter === "awaiting_payment") return t("awaitingPayment");
    if (initialFilter === "overdue") return t("overduePayments");
    if (initialFilter === "handovers_today") return t("handoversToday");
    if (initialFilter === "completed_month") return t("completedThisMonth");
    return t("deals");
  }, [initialFilter, segment, t, tArchive]);

  const isArchivedView = segment === "archived";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-zinc-400">{deals.length} {t("deals").toLowerCase()}</p>
        </div>
        {!isArchivedView ? (
          <Button asChild>
            <Link href="/deals/new">
              <Plus className="h-4 w-4" />
              {t("newDeal")}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {DEAL_LIST_SEGMENTS.map((value) => (
          <Button
            key={value}
            variant={segment === value ? "default" : "secondary"}
            onClick={() => {
              setSegment(value);
              applyFilters(value);
            }}
          >
            {tArchive(`segment.${value}` as "segment.active")}
          </Button>
        ))}
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
          <Button onClick={() => applyFilters()} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("applyFilters")}
          </Button>
        </CardContent>
      </Card>

      {deals.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="py-10 text-center text-sm text-zinc-400">
            {isArchivedView ? tArchive("archiveEmpty") : t("noDeals")}
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
            const archived = Boolean(deal.archived_at);

            return (
              <div
                key={deal.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <Link href={`/deals/${deal.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{deal.deal_number}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {tStatus(deal.status)}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {tPayment(deal.payment_status)}
                      </span>
                      {archived ? <ArchivedBadge /> : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">{clientLabel}</p>
                    <p className="text-xs text-zinc-500">
                      {t("vehicleA")}: {vehicleA} · {t("vehicleB")}: {vehicleB}
                    </p>
                    {archived ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {tArchive("archivedAt")}: {formatDateTime(deal.archived_at, "—")}
                      </p>
                    ) : null}
                  </Link>
                  <div className="flex items-start gap-2 lg:flex-col lg:items-end">
                    <div className="text-sm text-zinc-400 lg:text-right">
                      <p>
                        {t("additionalPayment")}:{" "}
                        {deal.additional_payment
                          ? `${formatCurrency(deal.additional_payment)} ${deal.currency}`
                          : t("noAdditionalPayment")}
                      </p>
                      {deal.signing_date ? (
                        <p>{t("signingDate")}: {formatDate(deal.signing_date)}</p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        {deal.assignee?.full_name ?? t("unassigned")} · {formatDate(deal.created_at)}
                      </p>
                    </div>
                    {(canArchive || canRestoreArchived) ? (
                      <OrderArchiveRowActions
                        entityName={deal.deal_number}
                        isArchived={archived}
                        canArchive={canArchive && !archived}
                        canRestore={canRestoreArchived && archived}
                        canPermanentlyDelete={false}
                        onArchive={() => archiveDealAction(deal.id, true)}
                        onRestore={() => archiveDealAction(deal.id, false)}
                        archiveLabel={t("archiveDeal")}
                        restoreLabel={t("restoreDeal")}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
