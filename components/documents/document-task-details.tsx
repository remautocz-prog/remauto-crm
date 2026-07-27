"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Mail,
  Pencil,
  Phone,
  Printer,
} from "lucide-react";
import type { ClientOption, Profile } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { getClientDisplayName } from "@/lib/clients/validation";
import {
  getTaskDueDate,
  isTaskArchived,
  isTaskOverdue,
} from "@/lib/documents/helpers";
import {
  getDocumentVehicleSnapshot,
  getDocumentVehicleTitle,
  type DocumentCarOption,
} from "@/lib/documents/vehicle";
import { archiveDocumentTaskAction, restoreDocumentTaskAction } from "@/lib/actions/documents";
import { AttachmentsPlaceholder } from "@/components/documents/attachments-placeholder";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { DocumentTaskFinancePanel } from "@/components/documents/document-task-finance-panel";
import { DocumentPriorityBadge } from "@/components/documents/document-priority-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentTaskFormDialog } from "@/components/documents/document-task-form-dialog";
import { PaymentDialog } from "@/components/documents/payment-dialog";
import { StatusChangeDialog } from "@/components/documents/status-change-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import {
  bindDocumentServiceTranslator,
  translateDocumentService,
} from "@/lib/i18n/documents";

type DocumentTaskDetailsProps = {
  task: DocumentTaskWithRelations;
  clients: ClientOption[];
  cars: DocumentCarOption[];
  profiles: Profile[];
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

export function DocumentTaskDetails({
  task,
  clients,
  cars,
  profiles,
}: DocumentTaskDetailsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const t = useTranslations("documents");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const tServices = useTranslations("documents.services");
  const { formatDate } = useFormatters();
  const dash = tCommon("dash");
  const overdue = isTaskOverdue(task);
  const archived = isTaskArchived(task);

  const serviceLabel =
    task.service_type === "custom"
      ? task.custom_service_name ?? tServices("custom")
      : task.service_type
        ? translateDocumentService(bindDocumentServiceTranslator(tServices as (key: never) => string), task.service_type)
        : dash;

  const vehicle = getDocumentVehicleSnapshot(task, task.car);
  const vehicleTitle = getDocumentVehicleTitle(task, task.car, dash);

  async function handleArchive() {
    if (!confirm(t("archiveConfirm"))) return;
    await archiveDocumentTaskAction(task.id);
  }

  async function handleRestore() {
    const result = await restoreDocumentTaskAction(task.id);
    if (result.success) router.refresh();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:hidden">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="px-0 text-zinc-400 hover:text-white">
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4" />
              {tActions("backToList")}
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white">#{task.id}</h2>
              <DocumentStatusBadge status={task.status} />
              <DocumentPriorityBadge priority={task.priority} />
              {overdue ? <span className="text-sm font-medium text-red-400">{t("overdue")}</span> : null}
              {archived ? <span className="text-sm text-zinc-400">{t("archived")}</span> : null}
            </div>
            <p className="text-zinc-400">{serviceLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            {tActions("edit")}
          </Button>
          <Button variant="secondary" onClick={() => setStatusOpen(true)}>
            {t("changeStatus")}
          </Button>
          <Button onClick={() => setPaymentOpen(true)}>{t("registerPayment")}</Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t("printSummary")}
          </Button>
          {archived ? (
            <Button variant="secondary" onClick={handleRestore}>
              <ArchiveRestore className="h-4 w-4" />
              {t("restoreTask")}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              {t("archiveTask")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("overviewTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <InfoRow label={tFields("service")} value={serviceLabel} />
            <InfoRow
              label={tFields("client")}
              value={
                task.client ? (
                  getClientDisplayName(task.client)
                ) : dash
              }
            />
            <InfoRow label={tFields("car")} value={vehicleTitle} />
            {vehicle.vin ? <InfoRow label={tFields("vin")} value={vehicle.vin} /> : null}
            {vehicle.plate ? (
              <InfoRow label={tFields("registrationNumber")} value={vehicle.plate} />
            ) : null}
            {vehicle.mode === "external" && vehicle.brand ? (
              <InfoRow label={tFields("brand")} value={vehicle.brand} />
            ) : null}
            {vehicle.mode === "external" && vehicle.model ? (
              <InfoRow label={tFields("model")} value={vehicle.model} />
            ) : null}
            {vehicle.mode === "external" && vehicle.year ? (
              <InfoRow label={tFields("year")} value={String(vehicle.year)} />
            ) : null}
            <InfoRow
              label={t("vehicleModeLabel")}
              value={vehicle.mode === "crm" ? t("vehicleModeCrm") : t("vehicleModeExternal")}
            />
            <InfoRow label={tFields("manager")} value={task.assignee?.full_name ?? t("unassigned")} />
            <InfoRow label={t("startDate")} value={formatDate(task.started_at, dash)} />
            <InfoRow
              label={t("dueDate")}
              value={`${formatDate(getTaskDueDate(task), dash)}${overdue ? ` (${t("overdue")})` : ""}`}
            />
            {task.notes ? (
              <div className="border-t border-zinc-800/80 pt-3">
                <p className="text-zinc-500">{tFields("notes")}</p>
                <p className="mt-2 whitespace-pre-wrap text-zinc-200">{task.notes}</p>
              </div>
            ) : null}
            {task.result_notes ? (
              <div className="border-t border-zinc-800/80 pt-3">
                <p className="text-zinc-500">{t("completionNotes")}</p>
                <p className="mt-2 whitespace-pre-wrap text-zinc-200">{task.result_notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("financeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentTaskFinancePanel task={task} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 print:hidden">
        {task.client ? (
          <>
            <Button asChild variant="secondary">
              <Link href={`/clients/${task.client.id}`}>{t("openClient")}</Link>
            </Button>
            {task.client.phone ? (
              <Button asChild variant="outline">
                <a href={`tel:${task.client.phone}`}>
                  <Phone className="h-4 w-4" />
                  {t("callClient")}
                </a>
              </Button>
            ) : null}
            {task.client.email ? (
              <Button asChild variant="outline">
                <a href={`mailto:${task.client.email}`}>
                  <Mail className="h-4 w-4" />
                  {t("emailClient")}
                </a>
              </Button>
            ) : null}
          </>
        ) : null}
        {task.car ? (
          <Button asChild variant="secondary">
            <Link href={`/cars/${task.car.id}`}>{t("openVehicle")}</Link>
          </Button>
        ) : null}
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("checklistTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentChecklist
            taskId={task.id}
            required={task.required_documents}
            received={task.received_documents}
          />
        </CardContent>
      </Card>

      <div className="print:hidden">
        <AttachmentsPlaceholder />
      </div>

      <p className="text-xs text-zinc-500 print:hidden">{t("paymentHistoryNote")}</p>

      <DocumentTaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        task={task}
        clients={clients}
        cars={cars}
        profiles={profiles}
      />
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} taskId={task.id} />
      <StatusChangeDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        taskId={task.id}
        currentStatus={task.status}
      />
    </div>
  );
}
