"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import {
  archiveDealAction,
  refreshDealSnapshotAction,
  saveTradeInVehicleToCrmAction,
  updateDealPaymentAction,
  updateDealStatusAction,
} from "@/lib/actions/deals";
import { buildDealActivityTimeline } from "@/lib/deals/activity";
import { getClientDisplayFromDeal, getVehicleLabelFromSnapshot } from "@/lib/deals/snapshots";
import type { DocumentTemplate } from "@/lib/types/document-templates";
import type { GeneratedDocument } from "@/lib/types/document-templates";
import type { DealWithRelations } from "@/lib/types/deals";
import { GeneratedDocumentsPanel } from "@/components/document-generator/generated-documents-panel";
import { DealHandoverPanel } from "@/components/deals/deal-handover-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DealDetailsProps = {
  deal: DealWithRelations;
  documentTemplates: DocumentTemplate[];
  generatedDocuments: GeneratedDocument[];
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

export function DealDetails({
  deal,
  documentTemplates,
  generatedDocuments,
}: DealDetailsProps) {
  const t = useTranslations("deals");
  const tStatus = useTranslations("deals.status");
  const tPayment = useTranslations("deals.paymentStatuses");
  const tPayer = useTranslations("deals.payer");
  const tActivity = useTranslations("deals.activity");
  const router = useRouter();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [cancelReason, setCancelReason] = useState("");
  const [handoverOpen, setHandoverOpen] = useState(false);

  const clientLabel = getClientDisplayFromDeal(
    deal.client
      ? {
          full_name: deal.client.full_name,
          company: deal.client.company,
          client_type: (deal.client.client_type as "individual" | "company") ?? "individual",
        }
      : null,
    deal.client_snapshot
  );
  const vehicleA = deal.vehicle_a
    ? `${deal.vehicle_a.brand} ${deal.vehicle_a.model}`
    : getVehicleLabelFromSnapshot(deal.vehicle_a_snapshot);
  const vehicleB = deal.vehicle_b
    ? `${deal.vehicle_b.brand} ${deal.vehicle_b.model}`
    : getVehicleLabelFromSnapshot(deal.vehicle_b_snapshot);

  const activityItems = buildDealActivityTimeline({
    deal,
    labels: {
      dealCreated: tActivity("created"),
      dealUpdated: tActivity("updated"),
      dealPrepared: tActivity("prepared"),
      dealSigned: tActivity("signed"),
      dealInProgress: tActivity("inProgress"),
      dealCompleted: tActivity("completed"),
      dealCancelled: (reason) => tActivity("cancelled", { reason }),
      dealArchived: tActivity("archived"),
      paymentChanged: (status) => tActivity("paymentChanged", { status }),
      snapshotRefreshed: tActivity("snapshotRefreshed"),
    },
  });

  function runStatus(status: Parameters<typeof updateDealStatusAction>[1]) {
    startTransition(async () => {
      const result = await updateDealStatusAction(deal.id, status, {
        cancelled_reason: cancelReason,
      });
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
        <Link href="/deals"><ArrowLeft className="h-4 w-4" />{t("backToList")}</Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{deal.deal_number}</h2>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{tStatus(deal.status)}</span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{tPayment(deal.payment_status)}</span>
            {deal.archived_at ? (
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">{t("archivedBadge")}</span>
            ) : null}
          </div>
          <p className="text-zinc-400">{t("exchangeWithAdditionalPayment")}</p>
          <p className="text-sm text-zinc-500">{clientLabel} · {deal.assignee?.full_name ?? t("unassigned")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href={`/deals/${deal.id}/edit`}><Pencil className="h-4 w-4" />{t("editDeal")}</Link></Button>
          {deal.status === "draft" ? <Button onClick={() => runStatus("prepared")} disabled={isPending}>{t("prepareDeal")}</Button> : null}
          {deal.status === "prepared" ? <Button onClick={() => runStatus("signed")} disabled={isPending}>{t("signDeal")}</Button> : null}
          {deal.status === "signed" ? <Button onClick={() => runStatus("in_progress")} disabled={isPending}>{t("markInProgress")}</Button> : null}
          {["signed", "in_progress"].includes(deal.status) ? <Button onClick={() => runStatus("completed")} disabled={isPending}>{t("completeDeal")}</Button> : null}
          <Button variant="outline" disabled={isPending} onClick={() => startTransition(async () => { await refreshDealSnapshotAction(deal.id); router.refresh(); })}>
            <RefreshCw className="h-4 w-4" />{t("refreshSnapshot")}
          </Button>
          <Button variant="outline" disabled={isPending} onClick={() => setHandoverOpen((open) => !open)}>
            {t("handoverProtocol")}
          </Button>
          <Button variant="ghost" disabled={isPending} onClick={() => startTransition(async () => { await archiveDealAction(deal.id, !deal.archived_at); router.refresh(); })}>
            {deal.archived_at ? t("restoreDeal") : t("archiveDeal")}
          </Button>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("summary")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <InfoRow label={t("vehicleA")} value={vehicleA} />
          <InfoRow label={t("vehicleB")} value={vehicleB} />
          <InfoRow label={t("agreedVehicleValue") + " A"} value={deal.vehicle_a_value != null ? `${formatCurrency(deal.vehicle_a_value)} ${deal.currency}` : "—"} />
          <InfoRow label={t("agreedVehicleValue") + " B"} value={deal.vehicle_b_value != null ? `${formatCurrency(deal.vehicle_b_value)} ${deal.currency}` : "—"} />
          <InfoRow label={t("additionalPayment")} value={deal.additional_payment ? `${formatCurrency(deal.additional_payment)} ${deal.currency}` : t("noAdditionalPayment")} />
          <InfoRow label={t("additionalPaymentPayer")} value={deal.additional_payment_payer ? tPayer(deal.additional_payment_payer) : "—"} />
          <InfoRow label={t("signingDate")} value={formatDate(deal.signing_date)} />
          <InfoRow label={t("signingPlace")} value={deal.signing_place ?? "—"} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle className="text-base text-white">{t("sections.customer")}</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <InfoRow label={t("customer")} value={clientLabel} />
            {deal.client_id ? (
              <Button asChild variant="link" className="mt-2 px-0"><Link href={`/clients/${deal.client_id}`}>{t("openClient")}</Link></Button>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle className="text-base text-white">{t("sections.payment")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label={t("paymentMethod")} value={deal.payment_method ?? "—"} />
            <InfoRow label={t("paymentDueDate")} value={formatDate(deal.payment_due_date)} />
            <InfoRow label={t("amountInWords")} value={deal.additional_payment_words ?? "—"} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => { await updateDealPaymentAction(deal.id, { payment_status: "paid", markPaid: true }); router.refresh(); })}>{t("markPaid")}</Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => { await updateDealPaymentAction(deal.id, { payment_status: "partially_paid" }); router.refresh(); })}>{t("markPartiallyPaid")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {deal.vehicle_b_source === "external" && !deal.vehicle_b_id ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">{t("externalVehicleHint")}</p>
            <Button disabled={isPending} onClick={() => startTransition(async () => {
              await saveTradeInVehicleToCrmAction(deal.id, {
                make: deal.vehicle_b_snapshot.make,
                model: deal.vehicle_b_snapshot.model,
                vin: deal.vehicle_b_snapshot.vin,
                registration_plate: deal.vehicle_b_snapshot.registration_plate,
                agreed_value: deal.vehicle_b_value,
              }, deal.client_id);
              router.refresh();
            })}>{t("saveVehicleToCrm")}</Button>
          </CardContent>
        </Card>
      ) : null}

      {handoverOpen ? <DealHandoverPanel deal={deal} /> : null}

      <GeneratedDocumentsPanel
        documents={generatedDocuments}
        templates={documentTemplates}
        clientId={deal.client_id}
        vehicleId={deal.vehicle_a_id}
        dealId={deal.id}
        dealType={deal.deal_type}
      />

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("activityHistory")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {activityItems.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="text-zinc-200">{item.title}</p>
                <p className="text-xs text-zinc-500">{formatDateTime(item.occurredAt)}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {deal.status !== "cancelled" ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle className="text-base text-white">{t("cancelDeal")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <input className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t("cancelReasonPlaceholder")} />
            <Button variant="destructive" disabled={isPending || !cancelReason.trim()} onClick={() => runStatus("cancelled")}>{t("cancelDeal")}</Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-amber-300/80">{t("snapshotWarning")}</p>
    </div>
  );
}
