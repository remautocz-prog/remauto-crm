"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
} from "lucide-react";
import type { Car as CarRecord } from "@/lib/types/cars";
import type {
  Client,
  ClientActivityItem,
  ClientNote,
} from "@/lib/types/clients";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { buildTelHref, buildWhatsAppHref } from "@/lib/clients/phone";
import type { ClientProfileFinance } from "@/lib/clients/profile-finance";
import { getClientDisplayName } from "@/lib/clients/validation";
import { ClientActivitySection } from "@/components/clients/client-activity-section";
import { ClientArchiveButton } from "@/components/clients/client-archive-button";
import { ClientDocumentsPanel } from "@/components/clients/client-documents-panel";
import { ClientFinancePanel } from "@/components/clients/client-finance-panel";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientNotesSection } from "@/components/clients/client-notes-section";
import { ClientSummaryCards } from "@/components/clients/client-summary-cards";
import { ClientTypeBadge } from "@/components/clients/client-type-badge";
import { ClientVehiclesPanel } from "@/components/clients/client-vehicles-panel";
import { DocumentTaskFormDialog } from "@/components/documents/document-task-form-dialog";
import { GeneratedDocumentsPanel } from "@/components/document-generator/generated-documents-panel";
import { DealsSection } from "@/components/deals/deals-section";
import type { DocumentCarOption } from "@/lib/documents/vehicle";
import type { ClientOption, Profile } from "@/lib/types/cars";
import type { DocumentTemplate, GeneratedDocument } from "@/lib/types/document-templates";
import type { DealWithRelations } from "@/lib/types/deals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translatePreferredLanguage } from "@/lib/i18n/clients";
import { cn } from "@/lib/utils";

type LinkableCar = {
  id: number;
  brand: string;
  model: string;
  year: number;
  vin: string | null;
  registration_number: string | null;
};

type ClientDetailsProps = {
  client: Client;
  cars: CarRecord[];
  carExpenseTotals: Record<number, number>;
  linkableCars: LinkableCar[];
  documentTasks: DocumentTaskWithRelations[];
  profileFinance: ClientProfileFinance;
  notes: ClientNote[];
  activityItems: ClientActivityItem[];
  currentUserId: string | null;
  documentFormOptions: {
    clients: ClientOption[];
    cars: DocumentCarOption[];
    profiles: Profile[];
  };
  documentTemplates: DocumentTemplate[];
  generatedDocuments: GeneratedDocument[];
  deals: DealWithRelations[];
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

export function ClientDetails({
  client,
  cars,
  carExpenseTotals,
  linkableCars,
  documentTasks,
  profileFinance,
  notes,
  activityItems,
  currentUserId,
  documentFormOptions,
  documentTemplates,
  generatedDocuments,
  deals,
}: ClientDetailsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);

  const t = useTranslations("clients");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const tPreferredLanguage = useTranslations("preferredLanguage");
  const { formatDate, formatCurrency } = useFormatters();
  const dash = tCommon("dash");

  const displayName = getClientDisplayName(client);
  const addressLine = [client.address, client.city, client.postal_code]
    .filter(Boolean)
    .join(", ");
  const telHref = buildTelHref(client.phone);
  const whatsappHref = buildWhatsAppHref(client.phone);
  const hasOutstanding = profileFinance.combined.outstanding > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
            {tActions("backToList")}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{displayName}</h2>
              <ClientTypeBadge clientType={client.client_type} />
              {!client.is_active ? (
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                  {t("archivedBadge")}
                </span>
              ) : null}
            </div>
            {client.client_type === "company" && client.full_name ? (
              <p className="text-zinc-400">{client.full_name}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
              {client.phone ? <span>{client.phone}</span> : null}
              {client.email ? <span>{client.email}</span> : null}
              {client.preferred_language ? (
                <span>
                  {translatePreferredLanguage(tPreferredLanguage, client.preferred_language)}
                </span>
              ) : null}
              <span>
                {tFields("created")}: {formatDate(client.created_at, dash)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {telHref ? (
              <Button asChild variant="outline">
                <a href={telHref}>
                  <Phone className="h-4 w-4" />
                  {t("call")}
                </a>
              </Button>
            ) : null}
            {whatsappHref ? (
              <Button asChild variant="outline">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {t("whatsapp")}
                </a>
              </Button>
            ) : null}
            {client.email ? (
              <Button asChild variant="outline">
                <a href={`mailto:${client.email}`}>
                  <Mail className="h-4 w-4" />
                  {t("sendEmail")}
                </a>
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              {t("editClient")}
            </Button>
            <ClientArchiveButton clientId={client.id} isActive={client.is_active} />
          </div>
        </div>
      </div>

      {hasOutstanding ? (
        <div className="rounded-lg border border-orange-500/30 bg-orange-950/40 px-4 py-3 text-sm text-orange-200">
          {t("clientHasOutstandingBalance")}: {formatCurrency(profileFinance.combined.outstanding)}
        </div>
      ) : (
        <div className="rounded-lg border border-green-500/20 bg-green-950/20 px-4 py-3 text-sm text-green-300">
          {t("noOutstandingBalance")}
        </div>
      )}

      <ClientSummaryCards finance={profileFinance} />

      <ClientDocumentsPanel
        clientId={client.id}
        tasks={documentTasks}
        onCreateOrder={() => setCreateDocumentOpen(true)}
      />

      <GeneratedDocumentsPanel
        documents={generatedDocuments}
        templates={documentTemplates}
        clientId={client.id}
      />

      <DealsSection deals={deals} createHref={`/deals/new?client_id=${client.id}`} />

      <ClientVehiclesPanel
        clientId={client.id}
        cars={cars}
        carExpenseTotals={carExpenseTotals}
        linkableCars={linkableCars}
      />

      <ClientNotesSection
        clientId={client.id}
        notes={notes}
        currentUserId={currentUserId}
      />

      <ClientFinancePanel finance={profileFinance} />

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("clientOverview")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <InfoRow label={tFields("phone")} value={client.phone ?? dash} />
          <InfoRow label={tFields("email")} value={client.email ?? dash} />
          <InfoRow label={tFields("address")} value={addressLine || dash} />
          <InfoRow label={tFields("country")} value={client.country ?? dash} />
          <InfoRow
            label={tFields("preferredLanguage")}
            value={
              client.preferred_language
                ? translatePreferredLanguage(tPreferredLanguage, client.preferred_language)
                : dash
            }
          />
          <InfoRow label={tFields("taxId")} value={client.tax_id ?? dash} />
          <InfoRow label={tFields("vatId")} value={client.vat_id ?? dash} />
          {client.bank_account ? (
            <InfoRow label={t("bankAccount")} value={client.bank_account} />
          ) : null}
          {client.client_type === "individual" ? (
            <>
              {(client.birth_date ||
                client.personal_id_number ||
                client.identity_document_number) && (
                <div className="border-t border-zinc-800/80 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("privateInformation")}
                  </p>
                  {client.birth_date ? (
                    <InfoRow label={t("birthDate")} value={formatDate(client.birth_date, dash)} />
                  ) : null}
                  {client.personal_id_number ? (
                    <InfoRow label={t("personalIdNumber")} value={client.personal_id_number} />
                  ) : null}
                  {client.identity_document_number ? (
                    <InfoRow
                      label={t("identityDocumentNumber")}
                      value={client.identity_document_number}
                    />
                  ) : null}
                </div>
              )}
            </>
          ) : null}
          {client.notes ? (
            <div className={cn("border-t border-zinc-800/80 pt-3")}>
              <p className="text-zinc-500">{tFields("notes")}</p>
              <p className="mt-2 whitespace-pre-wrap text-zinc-200">{client.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ClientActivitySection items={activityItems} />

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        client={client}
      />

      <DocumentTaskFormDialog
        open={createDocumentOpen}
        onOpenChange={setCreateDocumentOpen}
        mode="create"
        clients={documentFormOptions.clients}
        cars={documentFormOptions.cars}
        profiles={documentFormOptions.profiles}
        initialClientId={client.id}
      />
    </div>
  );
}
