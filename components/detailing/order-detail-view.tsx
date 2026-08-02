"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Pencil } from "lucide-react";
import type { DetailingOrderStatus } from "@/lib/constants/detailing";
import { changeDetailingOrderStatusAction } from "@/lib/actions/detailing";
import {
  hasServiceLevelAssignments,
  resolveCompanyRemainder,
  resolveOrderTotalCommission,
} from "@/lib/detailing/commission";
import { buildServicesSummary, getCustomerDisplayName } from "@/lib/detailing/validation";
import { buildOrderEmployeeNames } from "@/lib/detailing/order-employees";
import type {
  DetailingEmployeeWithProfile,
  DetailingOrderWithServices,
  DetailingService,
} from "@/lib/types/detailing";
import { DetailingOrderForm } from "@/components/detailing/order-form";
import { DetailingStatusBadge } from "@/components/detailing/status-badge";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddDetailingCostDialog } from "@/components/cars/add-detailing-cost-dialog";
import type { CarExpense } from "@/lib/types/cars";

import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingOrderDetailViewProps = {
  order: DetailingOrderWithServices;
  services: DetailingService[];
  employees: DetailingEmployeeWithProfile[];
  linkedCarExpense?: CarExpense | null;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

export function DetailingOrderDetailView({
  order,
  services,
  employees,
  linkedCarExpense = null,
}: DetailingOrderDetailViewProps) {
  const t = useTranslations("detailing");
  const router = useRouter();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const totalEmployeeCommissions = resolveOrderTotalCommission(order, order.services, order.status);
  const companyRemainder = resolveCompanyRemainder(order.final_price, totalEmployeeCommissions);
  const employeeNames = buildOrderEmployeeNames(order, order.services);
  const usesLegacyCommission =
    !hasServiceLevelAssignments(order.services) && Boolean(order.assigned_employee_id);
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  function changeStatus(status: DetailingOrderStatus) {
    startTransition(async () => {
      const result = await changeDetailingOrderStatusAction(order.id, status);
      if (!result.success) {
        setMessage({ text: result.error, type: "error" });
        return;
      }
      setMessage({ text: t("status.updated"), type: "success" });
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{t("editOrder")}</h3>
          <Button variant="outline" onClick={() => setEditing(false)}>{t("cancelEdit")}</Button>
        </div>
        <DetailingOrderForm
          services={services}
          employees={employees}
          order={order}
          compact
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{order.order_number}</h2>
            <DetailingStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {order.vehicle_make_model} · {order.registration_number}
          </p>
          <p className="text-sm text-zinc-500">
            {formatDate(order.appointment_date)} {order.appointment_time.slice(0, 5)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {t("fields.employee")}: {employeeNames}
          </p>
          {order.car_id ? (
            <p className="mt-1 text-sm">
              <Link
                href={`/cars/${order.car_id}`}
                className="text-red-400 hover:text-red-300"
              >
                {t("linkedVehicle")} →
              </Link>
            </p>
          ) : null}
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t("editOrder")}
        </Button>
      </div>

      {!isCancelled && !isDelivered ? (
        <div className="flex flex-wrap gap-2">
          {order.status === "scheduled" ? (
            <Button onClick={() => changeStatus("in_progress")} disabled={isPending}>
              {t("actions.startWork")}
            </Button>
          ) : null}
          {order.status === "in_progress" ? (
            <Button onClick={() => changeStatus("ready")} disabled={isPending}>
              {t("actions.markReady")}
            </Button>
          ) : null}
          {order.status === "ready" ? (
            <Button onClick={() => changeStatus("delivered")} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("actions.markDelivered")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => changeStatus("cancelled")} disabled={isPending}>
            {t("actions.cancelOrder")}
          </Button>
        </div>
      ) : null}

      {isDelivered && order.car_id ? (
        <AddDetailingCostDialog order={order} existingExpense={linkedCarExpense} />
      ) : null}

      {message ? (
        <p className={message.type === "error" ? "text-sm text-red-400" : "text-sm text-green-400"}>
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{t("sections.customer")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label={t("fields.customer")} value={getCustomerDisplayName(order) || "—"} />
            <DetailRow label={t("fields.phone")} value={order.customer_phone || "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("sections.vehicle")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label={t("fields.makeModel")} value={order.vehicle_make_model} />
            <DetailRow label={t("fields.registration")} value={order.registration_number} />
            <DetailRow label={t("fields.vehicleSize")} value={t(`vehicleSizes.${order.vehicle_size}`)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("sections.appointment")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DetailRow
              label={t("fields.date")}
              value={`${formatDate(order.appointment_date)} ${order.appointment_time.slice(0, 5)}`}
            />
            <DetailRow
              label={t("fields.expectedCompletion")}
              value={order.expected_completion_at ? formatDateTime(order.expected_completion_at) : "—"}
            />
          </CardContent>
        </Card>
      </div>

      <DetailingSection title={t("sections.services")} noPadding>
        <DetailingTable
          headers={[
            t("fields.serviceName"),
            t("fields.serviceEmployee"),
            t("fields.lineTotal"),
            t("fields.commissionPercent"),
            t("fields.commissionAmount"),
          ]}
          isEmpty={!order.services.length}
          emptyMessage={t("noServicesSelected")}
        >
          {order.services.map((service) => (
            <tr key={service.id}>
              <td className="px-4 py-3 text-zinc-300">
                {service.service_name_snapshot}
                {service.quantity > 1 ? ` ×${service.quantity}` : ""}
              </td>
              <td className="px-4 py-3">
                {service.employee_name_snapshot ?? t("fields.unassigned")}
              </td>
              <td className="px-4 py-3">{formatCurrency(service.total_price)}</td>
              <td className="px-4 py-3">
                {service.commission_percent_snapshot != null
                  ? `${service.commission_percent_snapshot}%`
                  : "—"}
              </td>
              <td className="px-4 py-3 font-medium">
                {formatCurrency(service.commission_amount)}
              </td>
            </tr>
          ))}
        </DetailingTable>
        <p className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500">
          {buildServicesSummary(order.services, 10)}
        </p>
        {usesLegacyCommission ? (
          <p className="border-t border-zinc-800 px-4 py-3 text-sm text-amber-300">
            {t("legacyOrderCommissionHint")}
          </p>
        ) : null}
      </DetailingSection>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("sections.finance")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label={t("fields.subtotal")} value={formatCurrency(order.services_subtotal)} />
            <DetailRow label={t("fields.surcharge")} value={formatCurrency(order.vehicle_surcharge_amount)} />
            <DetailRow label={t("fields.discount")} value={formatCurrency(order.discount_amount)} />
            <DetailRow label={t("fields.finalPrice")} value={formatCurrency(order.final_price)} />
            <DetailRow label={t("fields.totalEmployeeCommissions")} value={formatCurrency(totalEmployeeCommissions)} />
            <DetailRow label={t("fields.companyRemainder")} value={formatCurrency(companyRemainder)} />
            <DetailRow label={t("fields.paid")} value={formatCurrency(order.paid_amount)} />
            <DetailRow label={t("fields.remaining")} value={formatCurrency(order.remaining_amount)} />
            <DetailRow label={t("fields.paymentStatus")} value={t(`paymentStatus.${order.payment_status}`)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("sections.notes")}</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{order.notes || "—"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
