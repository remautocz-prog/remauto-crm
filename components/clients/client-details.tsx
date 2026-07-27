"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Car,
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Car as CarRecord } from "@/lib/types/cars";
import type {
  Client,
  ClientActivityItem,
  ClientRelatedCounts,
} from "@/lib/types/clients";
import type { DetailingOrder, DocumentTask, FinanceTransaction } from "@/lib/types/database";
import { getDocumentTaskTitle } from "@/lib/types/database";
import type { ClientFinanceSummary } from "@/lib/clients/revenue";
import { getClientDisplayName } from "@/lib/clients/validation";
import { ClientActivitySection } from "@/components/clients/client-activity-section";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientTypeBadge } from "@/components/clients/client-type-badge";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { BusinessModelBadge } from "@/components/cars/business-model-badge";
import { CarStatusBadge } from "@/components/cars/car-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translatePreferredLanguage } from "@/lib/i18n/clients";
import { translateBusinessModel } from "@/lib/i18n/business-model";
import { translateFinanceType, translateStatus } from "@/lib/i18n/status";

type ClientCarsGroups = {
  owned: CarRecord[];
  commission: CarRecord[];
  clientOrders: CarRecord[];
  asBuyer: CarRecord[];
  asOwner: CarRecord[];
};

type ClientDetailsProps = {
  client: Client;
  cars: CarRecord[];
  carGroups: ClientCarsGroups;
  documentTasks: DocumentTask[];
  detailingOrders: DetailingOrder[];
  financeTransactions: FinanceTransaction[];
  financeSummary: ClientFinanceSummary;
  relatedCounts: ClientRelatedCounts;
  activityItems: ClientActivityItem[];
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

function CarMiniRow({ car }: { car: CarRecord }) {
  const t = useTranslations("clients");
  const model = car.business_model ?? "owned";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 py-3 last:border-0">
      <div className="space-y-1">
        <Link href={`/cars/${car.id}`} className="font-medium text-white hover:text-red-400">
          {car.brand} {car.model} ({car.year})
        </Link>
        <div className="flex flex-wrap gap-2">
          <CarStatusBadge status={car.status} />
          <BusinessModelBadge businessModel={model} />
        </div>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/cars/${car.id}`}>{t("viewCar")}</Link>
      </Button>
    </div>
  );
}

function CarsGroupSection({
  title,
  cars,
  empty,
}: {
  title: string;
  cars: CarRecord[];
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-zinc-300">{title}</h4>
      {cars.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="rounded-lg border border-zinc-800/80 px-3">
          {cars.map((car) => (
            <CarMiniRow key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientDetails({
  client,
  carGroups,
  documentTasks,
  detailingOrders,
  financeTransactions,
  financeSummary,
  relatedCounts,
  activityItems,
}: ClientDetailsProps) {
  const [editOpen, setEditOpen] = useState(false);

  const t = useTranslations("clients");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const tDocuments = useTranslations("documents");
  const tDetailing = useTranslations("detailing");
  const tFinance = useTranslations("finance");
  const tBusinessModel = useTranslations("businessModel");
  const tStatus = useTranslations("status");
  const tPreferredLanguage = useTranslations("preferredLanguage");
  const { formatCurrency, formatDate } = useFormatters();
  const dash = tCommon("dash");

  const displayName = getClientDisplayName(client);
  const addressLine = [client.address, client.city, client.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
              {tActions("backToList")}
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{displayName}</h2>
              <ClientTypeBadge clientType={client.client_type} />
            </div>
            {client.client_type === "company" && client.full_name ? (
              <p className="text-zinc-400">{client.full_name}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            {t("editClient")}
          </Button>
          <Button asChild>
            <Link href={`/cars/new?client_id=${client.id}`}>
              <Car className="h-4 w-4" />
              {t("addVehicle")}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/documents?client_id=${client.id}`}>
              <FileText className="h-4 w-4" />
              {t("addDocumentTask")}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/detailing?client_id=${client.id}`}>
              <Sparkles className="h-4 w-4" />
              {t("addDetailingOrder")}
            </Link>
          </Button>
          {client.phone ? (
            <Button asChild variant="outline">
              <a href={`tel:${client.phone}`}>
                <Phone className="h-4 w-4" />
                {t("callPhone")}
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
          <DeleteClientButton clientId={client.id} relatedCounts={relatedCounts} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("detailsTitle")}</CardTitle>
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
            <InfoRow label={tFields("created")} value={formatDate(client.created_at, dash)} />
            {client.notes ? (
              <div className="border-t border-zinc-800/80 pt-3">
                <p className="text-zinc-500">{tFields("notes")}</p>
                <p className="mt-2 whitespace-pre-wrap text-zinc-200">{client.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("financeTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow
              label={t("remautoRevenue")}
              value={formatCurrency(financeSummary.remautoRevenue)}
            />
            <InfoRow
              label={tFinance("income")}
              value={formatCurrency(financeSummary.incomeTotal)}
            />
            <InfoRow
              label={tFinance("expense")}
              value={formatCurrency(financeSummary.expenseTotal)}
            />
            <InfoRow label={tFields("netProfit")} value={formatCurrency(financeSummary.netTotal)} />
            <InfoRow
              label={t("soldCarsCount")}
              value={String(financeSummary.soldCarsCount)}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("carsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <CarsGroupSection
            title={translateBusinessModel(tBusinessModel, "owned")}
            cars={carGroups.owned}
            empty={t("noOwnedCars")}
          />
          <CarsGroupSection
            title={translateBusinessModel(tBusinessModel, "commission")}
            cars={carGroups.commission}
            empty={t("noCommissionCars")}
          />
          <CarsGroupSection
            title={translateBusinessModel(tBusinessModel, "client_order")}
            cars={carGroups.clientOrders}
            empty={t("noClientOrderCars")}
          />
          <CarsGroupSection
            title={t("carsAsBuyer")}
            cars={carGroups.asBuyer}
            empty={t("noCarsAsBuyer")}
          />
          <CarsGroupSection
            title={t("carsAsOwner")}
            cars={carGroups.asOwner}
            empty={t("noCarsAsOwner")}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white">{t("documentsTitle")}</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/documents?client_id=${client.id}`}>
                <Plus className="h-4 w-4" />
                {t("addDocumentTask")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {documentTasks.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("noDocuments")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="pb-2 font-medium">{tDocuments("task")}</th>
                      <th className="pb-2 font-medium">{tFields("status")}</th>
                      <th className="pb-2 font-medium">{t("deadline")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentTasks.map((task) => (
                      <tr key={task.id} className="border-t border-zinc-800/80">
                        <td className="py-2 text-zinc-200">
                          {getDocumentTaskTitle(task, (id) =>
                            tDocuments("taskFallback", { id })
                          )}
                        </td>
                        <td className="py-2 text-zinc-300">
                          {translateStatus(tStatus, task.status)}
                        </td>
                        <td className="py-2 text-zinc-300">
                          {formatDate(task.deadline, dash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white">{t("detailingTitle")}</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/detailing?client_id=${client.id}`}>
                <Plus className="h-4 w-4" />
                {t("addDetailingOrder")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {detailingOrders.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("noDetailing")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="pb-2 font-medium">{tFields("car")}</th>
                      <th className="pb-2 font-medium">{tFields("status")}</th>
                      <th className="pb-2 font-medium">{tFields("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailingOrders.map((order) => (
                      <tr key={order.id} className="border-t border-zinc-800/80">
                        <td className="py-2 text-zinc-200">
                          {order.car_id ? (
                            <Link
                              href={`/cars/${order.car_id}`}
                              className="hover:text-red-400"
                            >
                              #{order.car_id}
                            </Link>
                          ) : (
                            dash
                          )}
                          {order.service_type ? ` — ${order.service_type}` : ""}
                        </td>
                        <td className="py-2 text-zinc-300">
                          {translateStatus(tStatus, order.status)}
                        </td>
                        <td className="py-2 text-zinc-300">
                          {formatCurrency(Number(order.price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {financeTransactions.length > 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("transactionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="pb-2 font-medium">{tFields("date")}</th>
                  <th className="pb-2 font-medium">{tFields("type")}</th>
                  <th className="pb-2 font-medium">{tFields("amount")}</th>
                  <th className="pb-2 font-medium">{tFields("description")}</th>
                </tr>
              </thead>
              <tbody>
                {financeTransactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-zinc-800/80">
                    <td className="py-2 text-zinc-300">
                      {formatDate(tx.transaction_date, dash)}
                    </td>
                    <td className="py-2 text-zinc-300">
                      {translateFinanceType(tStatus, tFinance, tx.type)}
                    </td>
                    <td className="py-2 text-zinc-200">
                      {formatCurrency(Number(tx.amount))}
                    </td>
                    <td className="py-2 text-zinc-300">{tx.description ?? dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <ClientActivitySection items={activityItems} />

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        client={client}
      />
    </div>
  );
}
