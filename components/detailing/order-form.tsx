"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  DETAILING_ORDER_STATUSES,
  DETAILING_PAYMENT_METHODS,
  type DetailingOrderStatus,
  type DetailingPaymentMethod,
  type DetailingVehicleSize,
} from "@/lib/constants/detailing";
import {
  createDetailingOrderAction,
  updateDetailingOrderAction,
} from "@/lib/actions/detailing";
import {
  calculateServiceCommission,
  resolveCommissionPercent,
  resolveCompanyRemainder,
  resolveOrderTotalCommission,
} from "@/lib/detailing/commission";
import {
  calculateOrderPricing,
  calculatePaymentStatus,
  calculateRemainingAmount,
} from "@/lib/detailing/pricing";
import {
  defaultAppointmentDate,
  defaultAppointmentTime,
  parseMoneyInput,
} from "@/lib/detailing/form-utils";
import type {
  DetailingEmployeeWithProfile,
  DetailingOrderWithServices,
  DetailingService,
} from "@/lib/types/detailing";
import { DetailingServicePicker, type ServiceLine } from "@/components/detailing/service-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingOrderFormProps = {
  services: DetailingService[];
  employees: DetailingEmployeeWithProfile[];
  order?: DetailingOrderWithServices;
  compact?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function DetailingOrderForm({
  services,
  employees,
  order,
  compact,
  onSuccess,
  onCancel,
}: DetailingOrderFormProps) {
  const router = useRouter();
  const t = useTranslations("detailing");
  const { formatCurrency } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isInternalDefault =
    !order?.customer_first_name &&
    !order?.customer_last_name &&
    !order?.customer_phone;

  const [isInternalVehicle, setIsInternalVehicle] = useState(isInternalDefault);
  const [customerFirstName, setCustomerFirstName] = useState(order?.customer_first_name ?? "");
  const [customerLastName, setCustomerLastName] = useState(order?.customer_last_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone ?? "");
  const [vehicleMakeModel, setVehicleMakeModel] = useState(order?.vehicle_make_model ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(order?.registration_number ?? "");
  const [vehicleSize, setVehicleSize] = useState<DetailingVehicleSize>(
    order?.vehicle_size ?? "standard"
  );
  const [appointmentDate, setAppointmentDate] = useState(
    order?.appointment_date ?? defaultAppointmentDate()
  );
  const [appointmentTime, setAppointmentTime] = useState(
    order?.appointment_time ?? defaultAppointmentTime()
  );
  const [expectedCompletion, setExpectedCompletion] = useState(
    order?.expected_completion_at?.slice(0, 16) ?? ""
  );
  const [status, setStatus] = useState<DetailingOrderStatus>(order?.status ?? "scheduled");
  const [paymentMethod, setPaymentMethod] = useState<DetailingPaymentMethod | "">(
    order?.payment_method ?? ""
  );
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [discountAmount, setDiscountAmount] = useState(String(order?.discount_amount ?? 0));
  const [finalPriceOverride, setFinalPriceOverride] = useState(
    order ? String(order.final_price) : ""
  );
  const [depositAmount, setDepositAmount] = useState(String(order?.deposit_amount ?? 0));
  const [paidAmount, setPaidAmount] = useState(String(order?.paid_amount ?? 0));
  const [lines, setLines] = useState<ServiceLine[]>(
    order?.services.map((service) => ({
      key: service.id,
      id: service.id,
      service_id: service.service_id,
      service_name_snapshot: service.service_name_snapshot,
      quantity: service.quantity,
      unit_price: service.unit_price,
      total_price: service.total_price,
      assigned_employee_id: service.assigned_employee_id,
      commission_percent: service.commission_percent_snapshot,
    })) ?? []
  );

  const pricing = useMemo(
    () =>
      calculateOrderPricing({
        services: lines.map((line) => ({
          unit_price: line.unit_price,
          quantity: line.quantity,
          total_price: line.total_price,
          price_type: line.price_type,
        })),
        vehicleSize,
        discountAmount: parseMoneyInput(discountAmount),
        finalPriceOverride:
          finalPriceOverride.trim() === "" ? null : parseMoneyInput(finalPriceOverride),
      }),
    [lines, vehicleSize, discountAmount, finalPriceOverride]
  );

  const isManualFinalPrice =
    finalPriceOverride.trim() !== "" &&
    Math.abs(parseMoneyInput(finalPriceOverride) - pricing.calculatedFinal) > 0.009;

  const remainingAmount = calculateRemainingAmount(
    pricing.finalPrice,
    parseMoneyInput(paidAmount)
  );
  const paymentStatus = calculatePaymentStatus(pricing.finalPrice, parseMoneyInput(paidAmount));
  const totalEmployeeCommissions = useMemo(() => {
    if (order && (order.status === "delivered" || order.status === "cancelled")) {
      return resolveOrderTotalCommission(order, order.services, order.status);
    }
    return lines.reduce((sum, line) => {
      if (!line.assigned_employee_id) return sum;
      const employee = employees.find((item) => item.profile_id === line.assigned_employee_id);
      const percent = resolveCommissionPercent(
        line.commission_percent ?? employee?.commission_percent
      );
      return sum + calculateServiceCommission(line.total_price, percent, status);
    }, 0);
  }, [lines, employees, status, order]);
  const companyRemainder = resolveCompanyRemainder(pricing.finalPrice, totalEmployeeCommissions);

  function handleSubmit() {
    if (isPending || submitted) return;
    setError(null);
    setSubmitted(true);

    startTransition(async () => {
      const payload = {
        customer_first_name: isInternalVehicle ? null : customerFirstName,
        customer_last_name: isInternalVehicle ? null : customerLastName,
        customer_phone: isInternalVehicle ? null : customerPhone,
        is_internal_vehicle: isInternalVehicle,
        vehicle_make_model: vehicleMakeModel,
        registration_number: registrationNumber,
        vehicle_size: vehicleSize,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        expected_completion_at: expectedCompletion
          ? new Date(expectedCompletion).toISOString()
          : null,
        status,
        notes,
        assigned_employee_id: null,
        payment_method: paymentMethod || null,
        services: lines.map((line) => ({
          id: line.id,
          service_id: line.service_id,
          service_name_snapshot: line.service_name_snapshot,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price,
          price_type: line.price_type,
          assigned_employee_id: line.assigned_employee_id ?? null,
          commission_percent: line.commission_percent ?? null,
        })),
        discount_amount: parseMoneyInput(discountAmount),
        final_price_override:
          finalPriceOverride.trim() === ""
            ? pricing.calculatedFinal
            : parseMoneyInput(finalPriceOverride),
        deposit_amount: parseMoneyInput(depositAmount),
        paid_amount: parseMoneyInput(paidAmount),
      };

      const result = order
        ? await updateDetailingOrderAction(order.id, payload)
        : await createDetailingOrderAction(payload);

      if (!result.success) {
        setError(result.error);
        setSubmitted(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
        return;
      }

      router.push(order ? `/detailing/orders/${order.id}` : `/detailing/orders/${result.data?.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-white">{t("sections.customer")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-zinc-600"
              checked={isInternalVehicle}
              onChange={(e) => setIsInternalVehicle(e.target.checked)}
            />
            <span>
              <span className="font-medium text-white">{t("internalVehicle")}</span>
              {isInternalVehicle ? (
                <span className="mt-1 block text-zinc-500">{t("internalVehicleHint")}</span>
              ) : null}
            </span>
          </label>
          {!isInternalVehicle ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">{t("fields.firstName")}</Label>
                <Input id="firstName" value={customerFirstName} onChange={(e) => setCustomerFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">{t("fields.lastName")}</Label>
                <Input id="lastName" value={customerLastName} onChange={(e) => setCustomerLastName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">{t("fields.phone")}</Label>
                <Input id="phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base font-semibold text-white">{t("sections.vehicle")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="makeModel">{t("fields.makeModel")} *</Label>
            <Input id="makeModel" value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="registration">{t("fields.registration")} *</Label>
            <Input id="registration" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label>{t("fields.vehicleSize")}</Label>
            <Select value={vehicleSize} onValueChange={(v) => setVehicleSize(v as DetailingVehicleSize)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t("vehicleSizes.standard")}</SelectItem>
                <SelectItem value="suv">{t("vehicleSizes.suv")}</SelectItem>
                <SelectItem value="xxl">{t("vehicleSizes.xxl")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base font-semibold text-white">{t("sections.services")} *</CardTitle></CardHeader>
        <CardContent>
          <DetailingServicePicker
            services={services}
            employees={employees}
            lines={lines}
            onChange={setLines}
            orderStatus={status}
          />
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base font-semibold text-white">{t("sections.appointment")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="date">{t("fields.date")} *</Label>
            <Input id="date" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="time">{t("fields.time")} *</Label>
            <Input id="time" type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="expected">{t("fields.expectedCompletion")}</Label>
            <Input id="expected" type="datetime-local" value={expectedCompletion} onChange={(e) => setExpectedCompletion(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {!compact ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle className="text-base font-semibold text-white">{t("sections.order")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("fields.status")}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DetailingOrderStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DETAILING_ORDER_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>{t(`status.${item}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="notes">{t("fields.notes")}</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="notes">{t("fields.notes")}</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
      <Card className="border-red-600/20 bg-zinc-900/80 shadow-lg shadow-red-950/10">
        <CardHeader><CardTitle className="text-base font-semibold text-white">{t("sections.finance")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{t("fields.finalPrice")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">{formatCurrency(pricing.finalPrice)}</p>
            {isManualFinalPrice ? (
              <p className="mt-1 text-xs text-amber-400">{t("manualPriceOverride")}</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">{t("calculatedPrice")}: {formatCurrency(pricing.calculatedFinal)}</p>
            )}
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>{t("fields.subtotal")}</span>
              <span className="text-white">{formatCurrency(pricing.servicesSubtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>{t("fields.surcharge")} ({pricing.surchargePercent}%)</span>
              <span className="text-white">{formatCurrency(pricing.vehicleSurchargeAmount)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>{t("fields.remaining")}</span>
              <span className="font-medium text-white">{formatCurrency(remainingAmount)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>{t("fields.paymentStatus")}</span>
              <span className="text-white">{t(`paymentStatus.${paymentStatus}`)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>{t("fields.totalEmployeeCommissions")}</span>
              <span className="text-white">{formatCurrency(totalEmployeeCommissions)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>{t("fields.companyRemainder")}</span>
              <span className="text-white">{formatCurrency(companyRemainder)}</span>
            </div>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
          <div className="space-y-1">
            <Label htmlFor="discount">{t("fields.discount")}</Label>
            <Input id="discount" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="finalPrice">{t("fields.finalPrice")} *</Label>
            <Input
              id="finalPrice"
              value={finalPriceOverride}
              onChange={(e) => setFinalPriceOverride(e.target.value)}
              placeholder={String(pricing.calculatedFinal)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="deposit">{t("fields.deposit")}</Label>
            <Input id="deposit" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="paid">{t("fields.paid")}</Label>
            <Input id="paid" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("fields.paymentMethod")}</Label>
            <Select value={paymentMethod || "none"} onValueChange={(v) => setPaymentMethod(v === "none" ? "" : (v as DetailingPaymentMethod))}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {DETAILING_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>{t(`paymentMethods.${method}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={handleSubmit} disabled={isPending || submitted} size="lg" className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {order ? t("saveOrder") : t("createOrder")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={isPending}
          size="lg"
          className="w-full"
        >
          {t("cancel")}
        </Button>
      </div>
        </div>
      </div>
    </div>
  );
}
