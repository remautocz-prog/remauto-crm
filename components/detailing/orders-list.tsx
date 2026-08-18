"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search } from "lucide-react";
import {
  DETAILING_ORDER_STATUSES,
  DETAILING_PAYMENT_STATUSES,
} from "@/lib/constants/detailing";
import { getCustomerDisplayName, buildServicesSummary } from "@/lib/detailing/validation";
import { buildOrderEmployeeNames } from "@/lib/detailing/order-employees";
import { getDetailingEmployeeDisplayName } from "@/lib/detailing/employee-display";
import {
  DETAILING_LIST_SEGMENTS,
  type DetailingListSegment,
} from "@/lib/detailing/list-segment";
import {
  archiveDetailingOrderAction,
  deleteDetailingOrderAction,
  restoreDetailingOrderAction,
} from "@/lib/actions/detailing";
import type {
  DetailingEmployeeWithProfile,
  DetailingOrderWithServices,
} from "@/lib/types/detailing";
import { DetailingInlineStatusSelect } from "@/components/detailing/order-inline-status-select";
import { DetailingPaymentStatusControl } from "@/components/detailing/order-payment-status-control";
import { DetailingEmptyState } from "@/components/detailing/detailing-empty-state";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { ArchivedBadge } from "@/components/shared/archived-badge";
import { OrderArchiveRowActions } from "@/components/shared/order-archive-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingOrdersListProps = {
  orders: DetailingOrderWithServices[];
  employees: DetailingEmployeeWithProfile[];
  initialQuery: string;
  initialStatus: string;
  initialPaymentStatus: string;
  initialEmployeeId: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialSegment: DetailingListSegment;
  canArchive: boolean;
  canRestoreArchived: boolean;
  canPermanentlyDelete: boolean;
};

export function DetailingOrdersList({
  orders,
  employees,
  initialQuery,
  initialStatus,
  initialPaymentStatus,
  initialEmployeeId,
  initialDateFrom,
  initialDateTo,
  initialSegment,
  canArchive,
  canRestoreArchived,
  canPermanentlyDelete,
}: DetailingOrdersListProps) {
  const t = useTranslations("detailing");
  const tArchive = useTranslations("archive");
  const router = useRouter();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [segment, setSegment] = useState<DetailingListSegment>(initialSegment);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const isArchivedView = segment === "archived";
  const isReadOnlyRow = isArchivedView;

  const hasFilters =
    Boolean(initialQuery) ||
    (initialStatus && initialStatus !== "all") ||
    (initialPaymentStatus && initialPaymentStatus !== "all") ||
    (initialEmployeeId && initialEmployeeId !== "all") ||
    Boolean(initialDateFrom) ||
    Boolean(initialDateTo) ||
    initialSegment !== "active";

  function applyFilters(nextSegment = segment) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status && status !== "all") params.set("status", status);
    if (paymentStatus && paymentStatus !== "all") params.set("payment_status", paymentStatus);
    if (employeeId && employeeId !== "all") params.set("employee_id", employeeId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (nextSegment !== "active") params.set("segment", nextSegment);
    startTransition(() => router.push(`/detailing/orders?${params.toString()}`));
  }

  return (
    <div className="space-y-6">
      <DetailingPageHeader
        title={isArchivedView ? tArchive("archivedOrders") : t("ordersTitle")}
        description={`${orders.length} ${t("ordersCount")}`}
        action={
          isArchivedView
            ? undefined
            : { label: t("newOrder"), href: "/detailing/orders/new", icon: Plus }
        }
      />

      <div className="flex flex-wrap gap-2">
        {DETAILING_LIST_SEGMENTS.map((value) => (
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

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="grid gap-3 pt-6 md:grid-cols-3 xl:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <Select value={status || "all"} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder={t("fields.status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {DETAILING_ORDER_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{t(`status.${item}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus || "all"} onValueChange={setPaymentStatus}>
            <SelectTrigger><SelectValue placeholder={t("fields.paymentStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPaymentStatuses")}</SelectItem>
              {DETAILING_PAYMENT_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{t(`paymentStatus.${item}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employeeId || "all"} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder={t("fields.employee")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allEmployees")}</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.profile_id} value={employee.profile_id}>
                  {getDetailingEmployeeDisplayName(employee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button onClick={() => applyFilters()} disabled={isPending} className="md:col-span-2 xl:col-span-1" size="lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("applyFilters")}
          </Button>
        </CardContent>
      </Card>

      {toast ? (
        <p
          className={
            toast.type === "error"
              ? "text-sm text-red-400"
              : toast.type === "warning"
                ? "text-sm text-amber-400"
                : "text-sm text-green-400"
          }
        >
          {toast.message}
        </p>
      ) : null}

      {!orders.length && !hasFilters ? (
        <DetailingEmptyState
          title={isArchivedView ? tArchive("archiveEmpty") : t("noOrdersYet")}
          description={isArchivedView ? tArchive("archiveEmptyHint") : t("emptyDashboardMessage")}
          icon={Plus}
          action={
            isArchivedView
              ? undefined
              : { label: t("createFirstOrder"), href: "/detailing/orders/new" }
          }
        />
      ) : (
        <>
          <DetailingSection title={t("tableTitle")} noPadding className="hidden md:block">
            <DetailingTable
              headers={[
                t("columns.orderNumber"),
                t("columns.appointment"),
                t("columns.vehicle"),
                t("fields.registration"),
                t("columns.customer"),
                t("columns.employee"),
                t("columns.finalPrice"),
                t("columns.payment"),
                t("columns.remaining"),
                t("columns.status"),
                ...(isArchivedView ? [tArchive("archivedAt")] : []),
                ...(canArchive || canRestoreArchived || canPermanentlyDelete ? [t("columns.actions")] : []),
              ]}
              isEmpty={!orders.length}
              emptyMessage={isArchivedView ? tArchive("archiveEmpty") : t("noOrders")}
            >
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/detailing/orders/${order.id}`} className="font-semibold text-red-400 hover:text-red-300">
                        {order.order_number}
                      </Link>
                      {isArchivedView ? <ArchivedBadge /> : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatDate(order.appointment_date)} {order.appointment_time.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{order.vehicle_make_model}</div>
                    <div className="text-xs text-zinc-500">{buildServicesSummary(order.services, 1)}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{order.registration_number}</td>
                  <td className="px-4 py-3">{getCustomerDisplayName(order) || "—"}</td>
                  <td className="px-4 py-3">{buildOrderEmployeeNames(order, order.services)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.final_price)}</td>
                  <td className="px-4 py-3">
                    {isReadOnlyRow ? (
                      <span className="text-zinc-300">{t(`paymentStatus.${order.payment_status}`)}</span>
                    ) : (
                      <DetailingPaymentStatusControl
                        orderId={order.id}
                        orderStatus={order.status}
                        paymentStatus={order.payment_status}
                        paidAmount={order.paid_amount}
                        remainingAmount={order.remaining_amount}
                        finalPrice={order.final_price}
                        onToast={setToast}
                        compact
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(order.remaining_amount)}</td>
                  <td className="px-4 py-3">
                    {isReadOnlyRow ? (
                      <span className="text-zinc-300">{t(`status.${order.status}`)}</span>
                    ) : (
                      <DetailingInlineStatusSelect orderId={order.id} status={order.status} onToast={setToast} />
                    )}
                  </td>
                  {isArchivedView ? (
                    <td className="px-4 py-3 text-zinc-300">
                      {formatDateTime(order.archived_at, "—")}
                    </td>
                  ) : null}
                  {(canArchive || canRestoreArchived || canPermanentlyDelete) ? (
                    <td className="px-4 py-3">
                      <OrderArchiveRowActions
                        entityName={order.order_number}
                        isArchived={isArchivedView}
                        canArchive={canArchive && !isArchivedView}
                        canRestore={canRestoreArchived && isArchivedView}
                        canPermanentlyDelete={canPermanentlyDelete && isArchivedView}
                        onArchive={() => archiveDetailingOrderAction(order.id)}
                        onRestore={() => restoreDetailingOrderAction(order.id)}
                        onPermanentDelete={() => deleteDetailingOrderAction(order.id)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </DetailingTable>
          </DetailingSection>

          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/detailing/orders/${order.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-red-400">{order.order_number}</p>
                      {isArchivedView ? <ArchivedBadge /> : null}
                    </div>
                    <p className="text-sm text-zinc-400">
                      {formatDate(order.appointment_date)} {order.appointment_time.slice(0, 5)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!isReadOnlyRow ? (
                      <>
                        <DetailingPaymentStatusControl
                          orderId={order.id}
                          orderStatus={order.status}
                          paymentStatus={order.payment_status}
                          paidAmount={order.paid_amount}
                          remainingAmount={order.remaining_amount}
                          finalPrice={order.final_price}
                          onToast={setToast}
                          compact
                        />
                        <DetailingInlineStatusSelect orderId={order.id} status={order.status} onToast={setToast} />
                      </>
                    ) : null}
                    {(canArchive || canRestoreArchived || canPermanentlyDelete) ? (
                      <OrderArchiveRowActions
                        entityName={order.order_number}
                        isArchived={isArchivedView}
                        canArchive={canArchive && !isArchivedView}
                        canRestore={canRestoreArchived && isArchivedView}
                        canPermanentlyDelete={canPermanentlyDelete && isArchivedView}
                        onArchive={() => archiveDetailingOrderAction(order.id)}
                        onRestore={() => restoreDetailingOrderAction(order.id)}
                        onPermanentDelete={() => deleteDetailingOrderAction(order.id)}
                      />
                    ) : null}
                  </div>
                </div>
                <Link href={`/detailing/orders/${order.id}`} className="mt-2 block">
                  <p className="font-medium text-white">{order.vehicle_make_model}</p>
                  <p className="text-sm text-zinc-500">{order.registration_number}</p>
                  <p className="mt-1 text-sm text-zinc-400">{getCustomerDisplayName(order) || "—"}</p>
                  {isArchivedView ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      {tArchive("archivedAt")}: {formatDateTime(order.archived_at, "—")}
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-sm">
                    <span className="font-medium">{formatCurrency(order.final_price)}</span>
                    <span className="text-zinc-500">
                      {t("fields.remaining")}: {formatCurrency(order.remaining_amount)}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
            {!orders.length ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                {isArchivedView ? tArchive("archiveEmpty") : t("noOrders")}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
