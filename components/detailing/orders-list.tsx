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
import type {
  DetailingEmployeeWithProfile,
  DetailingOrderWithServices,
} from "@/lib/types/detailing";
import { DetailingInlineStatusSelect } from "@/components/detailing/order-inline-status-select";
import { DetailingPaymentStatusControl } from "@/components/detailing/order-payment-status-control";
import { DetailingStatusBadge } from "@/components/detailing/status-badge";
import { DetailingEmptyState } from "@/components/detailing/detailing-empty-state";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
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
}: DetailingOrdersListProps) {
  const t = useTranslations("detailing");
  const router = useRouter();
  const { formatCurrency, formatDate } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const hasFilters =
    Boolean(initialQuery) ||
    (initialStatus && initialStatus !== "all") ||
    (initialPaymentStatus && initialPaymentStatus !== "all") ||
    (initialEmployeeId && initialEmployeeId !== "all") ||
    Boolean(initialDateFrom) ||
    Boolean(initialDateTo);

  function applyFilters() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status && status !== "all") params.set("status", status);
    if (paymentStatus && paymentStatus !== "all") params.set("payment_status", paymentStatus);
    if (employeeId && employeeId !== "all") params.set("employee_id", employeeId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    startTransition(() => router.push(`/detailing/orders?${params.toString()}`));
  }

  return (
    <div className="space-y-6">
      <DetailingPageHeader
        title={t("ordersTitle")}
        description={`${orders.length} ${t("ordersCount")}`}
        action={{ label: t("newOrder"), href: "/detailing/orders/new", icon: Plus }}
      />

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
          <Button onClick={applyFilters} disabled={isPending} className="md:col-span-2 xl:col-span-1" size="lg">
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
          title={t("noOrdersYet")}
          description={t("emptyDashboardMessage")}
          icon={Plus}
          action={{ label: t("createFirstOrder"), href: "/detailing/orders/new" }}
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
              ]}
              isEmpty={!orders.length}
              emptyMessage={t("noOrders")}
            >
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-900/50"
                  onClick={() => router.push(`/detailing/orders/${order.id}`)}
                >
                  <td className="px-4 py-3 font-semibold text-red-400">{order.order_number}</td>
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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                  </td>
                  <td className="px-4 py-3">{formatCurrency(order.remaining_amount)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DetailingInlineStatusSelect orderId={order.id} status={order.status} onToast={setToast} />
                  </td>
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
                    <p className="font-semibold text-red-400">{order.order_number}</p>
                    <p className="text-sm text-zinc-400">
                      {formatDate(order.appointment_date)} {order.appointment_time.slice(0, 5)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <DetailingStatusBadge status={order.status} />
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
                  </div>
                </div>
                <Link href={`/detailing/orders/${order.id}`} className="mt-2 block">
                  <p className="font-medium text-white">{order.vehicle_make_model}</p>
                  <p className="text-sm text-zinc-500">{order.registration_number}</p>
                  <p className="mt-1 text-sm text-zinc-400">{getCustomerDisplayName(order) || "—"}</p>
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
              <p className="py-8 text-center text-sm text-zinc-500">{t("noOrders")}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
