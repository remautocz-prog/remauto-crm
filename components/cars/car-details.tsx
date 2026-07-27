"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, BadgeCheck, ExternalLink, Pencil } from "lucide-react";
import type { Car, CarExpense, ClientOption } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { DocumentsSection } from "@/components/documents/documents-section";
import { DEFAULT_BUSINESS_MODEL } from "@/lib/constants/business-model";
import { formatGrossCommissionDisplay } from "@/lib/cars/business-rules";
import { CarStatusBadge } from "@/components/cars/car-status-badge";
import { BusinessModelBadge } from "@/components/cars/business-model-badge";
import { CarExpensesSection } from "@/components/cars/car-expenses-section";
import { DeleteCarButton } from "@/components/cars/delete-car-button";
import { MarkSoldDialog } from "@/components/cars/mark-sold-dialog";
import { ProfitSummary } from "@/components/cars/profit-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateBusinessModel, translateCommissionType } from "@/lib/i18n/business-model";

type CarDetailsProps = {
  car: Car;
  expenses: CarExpense[];
  clients: ClientOption[];
  clientName?: string | null;
  ownerName?: string | null;
  managerName?: string | null;
  documentTasks?: DocumentTaskWithRelations[];
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

export function CarDetails({
  car,
  expenses,
  clients,
  clientName,
  ownerName,
  managerName,
  documentTasks = [],
}: CarDetailsProps) {
  const [soldOpen, setSoldOpen] = useState(false);
  const tDocuments = useTranslations("documents");
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );
  const model = car.business_model ?? DEFAULT_BUSINESS_MODEL;

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const tBusinessModel = useTranslations("businessModel");
  const tCommissionType = useTranslations("commissionType");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const dash = tCommon("dash");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
            <Link href="/cars">
              <ArrowLeft className="h-4 w-4" />
              {tActions("backToList")}
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {car.brand} {car.model}
              </h2>
              <CarStatusBadge status={car.status} />
              <BusinessModelBadge businessModel={model} />
            </div>
            <p className="text-zinc-400">
              {car.year} {t("yearSuffix")}
              {car.stock_number ? ` • ${car.stock_number}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/cars/${car.id}/edit`}>
              <Pencil className="h-4 w-4" />
              {tActions("edit")}
            </Link>
          </Button>
          {car.status !== "sold" ? (
            <Button onClick={() => setSoldOpen(true)}>
              <BadgeCheck className="h-4 w-4" />
              {tActions("markAsSold")}
            </Button>
          ) : null}
          <DeleteCarButton carId={car.id} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <InfoRow
              label={tFields("businessModel")}
              value={translateBusinessModel(tBusinessModel, model)}
            />
            <InfoRow label={tFields("vin")} value={car.vin ?? dash} />
            <InfoRow
              label={tFields("registrationNumber")}
              value={car.registration_number ?? dash}
            />
            <InfoRow label={tFields("color")} value={car.color ?? dash} />

            {model === "owned" ? (
              <>
                <InfoRow
                  label={tFields("purchasePrice")}
                  value={
                    car.purchase_price != null
                      ? formatCurrency(Number(car.purchase_price))
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("plannedSalePrice")}
                  value={
                    car.sale_price != null
                      ? formatCurrency(Number(car.sale_price))
                      : dash
                  }
                />
              </>
            ) : null}

            {model === "commission" ? (
              <>
                <InfoRow label={tFields("owner")} value={ownerName ?? dash} />
                <InfoRow
                  label={tFields("ownerNetAmount")}
                  value={
                    car.owner_net_amount != null
                      ? formatCurrency(Number(car.owner_net_amount))
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("commissionType")}
                  value={
                    car.commission_type
                      ? translateCommissionType(tCommissionType, car.commission_type)
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("commissionValue")}
                  value={
                    car.commission_value != null
                      ? car.commission_type === "percentage"
                        ? `${car.commission_value}%`
                        : formatCurrency(Number(car.commission_value))
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("plannedSalePrice")}
                  value={
                    car.sale_price != null
                      ? formatCurrency(Number(car.sale_price))
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("contractEndDate")}
                  value={formatDate(car.contract_end_date, dash)}
                />
                {car.contract_document_url ? (
                  <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3">
                    <span className="text-zinc-500">{tFields("contractDocument")}</span>
                    <a
                      href={car.contract_document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                    >
                      {t("viewContract")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <InfoRow label={tFields("contractDocument")} value={dash} />
                )}
              </>
            ) : null}

            {model === "client_order" ? (
              <>
                <InfoRow label={tFields("client")} value={clientName ?? dash} />
                <InfoRow
                  label={tFields("commissionType")}
                  value={
                    car.commission_type
                      ? translateCommissionType(tCommissionType, car.commission_type)
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("vehiclePrice")}
                  value={
                    car.sale_price != null
                      ? formatCurrency(Number(car.sale_price))
                      : dash
                  }
                />
                <InfoRow
                  label={tFields("remautoCommission")}
                  value={formatGrossCommissionDisplay(car, formatCurrency) ?? dash}
                />
              </>
            ) : null}

            <InfoRow
              label={tFields("actualSalePrice")}
              value={
                car.actual_sale_price != null && Number(car.actual_sale_price) > 0
                  ? formatCurrency(Number(car.actual_sale_price))
                  : dash
              }
            />
            <InfoRow
              label={tFields("purchaseDate")}
              value={formatDate(car.purchase_date, dash)}
            />
            <InfoRow label={tFields("saleDate")} value={formatDate(car.sale_date, dash)} />
            {model !== "client_order" ? (
              <InfoRow label={tFields("client")} value={clientName ?? dash} />
            ) : null}
            <InfoRow label={tFields("manager")} value={managerName ?? dash} />
            <InfoRow
              label={tFields("created")}
              value={formatDateTime(car.created_at, dash)}
            />
            <InfoRow
              label={tFields("updated")}
              value={formatDateTime(car.updated_at, dash)}
            />
            {car.notes ? (
              <div className="pt-4">
                <p className="mb-2 text-zinc-500">{tFields("notes")}</p>
                <p className="whitespace-pre-wrap text-zinc-300">{car.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ProfitSummary car={car} totalExpenses={totalExpenses} />
      </div>

      {(model === "owned" || model === "commission" || model === "client_order") && (
        <CarExpensesSection car={car} expenses={expenses} />
      )}

      <DocumentsSection
        title={tDocuments("title")}
        tasks={documentTasks}
        createHref={`/documents?car_id=${car.id}${car.client_id ? `&client_id=${car.client_id}` : ""}`}
        emptyMessage={tDocuments("empty")}
        compact
      />

      <MarkSoldDialog
        car={car}
        clients={clients}
        open={soldOpen}
        onOpenChange={setSoldOpen}
      />
    </div>
  );
}
