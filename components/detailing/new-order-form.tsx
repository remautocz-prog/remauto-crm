"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Car,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Wallet,
} from "lucide-react";
import {
  DETAILING_PAYMENT_METHODS,
  type DetailingPaymentMethod,
  type DetailingVehicleSize,
} from "@/lib/constants/detailing";
import { createDetailingOrderAction } from "@/lib/actions/detailing";
import {
  calculateServiceCommission,
  resolveCommissionPercent,
  resolveCompanyRemainder,
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
  DetailingOrderPrefill,
  DetailingService,
} from "@/lib/types/detailing";
import type { DetailingQueryWarning } from "@/lib/detailing/query-utils";
import {
  DetailingServicePicker,
  type ServiceLine,
} from "@/components/detailing/service-picker";
import { DetailingSection } from "@/components/detailing/detailing-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type DetailingNewOrderFormProps = {
  services: DetailingService[];
  employees: DetailingEmployeeWithProfile[];
  warnings?: DetailingQueryWarning[];
  prefill?: DetailingOrderPrefill | null;
};

const VEHICLE_SIZES: DetailingVehicleSize[] = ["standard", "suv", "xxl"];

function SectionIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
  ) : (
    <Circle className="h-5 w-5 text-zinc-600" aria-hidden />
  );
}

export function DetailingNewOrderForm({
  services,
  employees,
  warnings = [],
  prefill = null,
}: DetailingNewOrderFormProps) {
  const router = useRouter();
  const t = useTranslations("detailing");
  const { formatCurrency } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [isInternalVehicle, setIsInternalVehicle] = useState(
    prefill?.isInternalVehicle ?? false
  );
  const [customerFirstName, setCustomerFirstName] = useState(
    prefill?.customerFirstName ?? ""
  );
  const [customerLastName, setCustomerLastName] = useState(
    prefill?.customerLastName ?? ""
  );
  const [customerPhone, setCustomerPhone] = useState(prefill?.customerPhone ?? "");
  const [vehicleMakeModel, setVehicleMakeModel] = useState(
    prefill?.vehicleMakeModel ?? ""
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    prefill?.registrationNumber ?? ""
  );
  const [vehicleSize, setVehicleSize] = useState<DetailingVehicleSize>("standard");
  const [appointmentDate, setAppointmentDate] = useState(defaultAppointmentDate());
  const [appointmentTime, setAppointmentTime] = useState(defaultAppointmentTime());
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<DetailingPaymentMethod | "">("");
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [finalPriceOverride, setFinalPriceOverride] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [lines, setLines] = useState<ServiceLine[]>([]);

  const employeeLoadFailed = warnings.some((warning) =>
    warning.query.includes("getDetailingEmployees")
  );
  const servicesLoadFailed = warnings.some((warning) =>
    warning.query.includes("getDetailingServices")
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
  const totalEmployeeCommissions = useMemo(
    () =>
      lines.reduce((sum, line) => {
        if (!line.assigned_employee_id) return sum;
        const employee = employees.find((item) => item.profile_id === line.assigned_employee_id);
        const percent = resolveCommissionPercent(
          line.commission_percent ?? employee?.commission_percent
        );
        return sum + calculateServiceCommission(line.total_price, percent, "scheduled");
      }, 0),
    [lines, employees]
  );
  const companyRemainder = resolveCompanyRemainder(pricing.finalPrice, totalEmployeeCommissions);

  const sectionStatus = useMemo(() => {
    const hasCustomer =
      isInternalVehicle ||
      Boolean(
        customerFirstName.trim() || customerLastName.trim() || customerPhone.trim()
      );
    return {
      customer: hasCustomer,
      vehicle: Boolean(vehicleMakeModel.trim() && registrationNumber.trim()),
      services: lines.length > 0,
      appointment: Boolean(appointmentDate && appointmentTime),
      employee: true,
      finance: pricing.finalPrice >= 0,
      notes: true,
    };
  }, [
    isInternalVehicle,
    customerFirstName,
    customerLastName,
    customerPhone,
    vehicleMakeModel,
    registrationNumber,
    lines.length,
    appointmentDate,
    appointmentTime,
    pricing.finalPrice,
  ]);

  const requiredComplete = [
    sectionStatus.customer,
    sectionStatus.vehicle,
    sectionStatus.services,
    sectionStatus.appointment,
  ].filter(Boolean).length;

  const canSubmit = requiredComplete === 4 && !isPending && !submitted;

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitted(true);

    startTransition(async () => {
      const payload = {
        customer_first_name: isInternalVehicle ? null : customerFirstName,
        customer_last_name: isInternalVehicle ? null : customerLastName,
        customer_phone: isInternalVehicle ? null : customerPhone,
        is_internal_vehicle: isInternalVehicle,
        car_id: prefill?.carId ?? null,
        vehicle_make_model: vehicleMakeModel,
        registration_number: registrationNumber,
        vehicle_size: vehicleSize,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        expected_completion_at: expectedCompletion
          ? new Date(expectedCompletion).toISOString()
          : null,
        status: "scheduled" as const,
        notes,
        assigned_employee_id: null,
        payment_method: paymentMethod || null,
        services: lines.map((line) => ({
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

      const result = await createDetailingOrderAction(payload);

      if (!result.success) {
        setError(result.error);
        setSubmitted(false);
        return;
      }

      router.push(`/detailing/orders/${result.data?.id}`);
      router.refresh();
    });
  }

  const financeSummary = (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-600/25 bg-gradient-to-br from-red-950/40 to-zinc-950/80 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {t("fields.finalPrice")}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white">
          {formatCurrency(pricing.finalPrice)}
        </p>
        {isManualFinalPrice ? (
          <p className="mt-2 text-xs text-amber-400">{t("manualPriceOverride")}</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            {t("calculatedPrice")}: {formatCurrency(pricing.calculatedFinal)}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>{t("fields.subtotal")}</span>
          <span className="tabular-nums text-zinc-200">
            {formatCurrency(pricing.servicesSubtotal)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>
            {t("fields.surcharge")} ({pricing.surchargePercent}%)
          </span>
          <span className="tabular-nums text-zinc-200">
            {formatCurrency(pricing.vehicleSurchargeAmount)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>{t("fields.discount")}</span>
          <span className="tabular-nums text-zinc-200">
            −{formatCurrency(pricing.discountAmount)}
          </span>
        </div>
        <div className="border-t border-zinc-800 pt-2">
          <div className="flex justify-between font-medium text-zinc-300">
            <span>{t("fields.remaining")}</span>
            <span className="tabular-nums text-white">{formatCurrency(remainingAmount)}</span>
          </div>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>{t("fields.paymentStatus")}</span>
          <span className="text-zinc-200">{t(`paymentStatus.${paymentStatus}`)}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>{t("fields.totalEmployeeCommissions")}</span>
          <span className="tabular-nums text-zinc-200">
            {formatCurrency(totalEmployeeCommissions)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>{t("fields.companyRemainder")}</span>
          <span className="tabular-nums text-zinc-200">
            {formatCurrency(companyRemainder)}
          </span>
        </div>
      </div>
    </div>
  );

  const financeInputs = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="discount">{t("fields.discount")}</Label>
        <Input
          id="discount"
          inputMode="decimal"
          value={discountAmount}
          onChange={(e) => setDiscountAmount(e.target.value)}
          className="bg-zinc-950/60"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="finalPrice">{t("fields.finalPrice")}</Label>
        <Input
          id="finalPrice"
          inputMode="decimal"
          value={finalPriceOverride}
          onChange={(e) => setFinalPriceOverride(e.target.value)}
          placeholder={String(pricing.calculatedFinal)}
          className="bg-zinc-950/60"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="deposit">{t("fields.deposit")}</Label>
        <Input
          id="deposit"
          inputMode="decimal"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="bg-zinc-950/60"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="paid">{t("fields.paid")}</Label>
        <Input
          id="paid"
          inputMode="decimal"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
          className="bg-zinc-950/60"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{t("fields.paymentMethod")}</Label>
        <Select
          value={paymentMethod || "none"}
          onValueChange={(v) =>
            setPaymentMethod(v === "none" ? "" : (v as DetailingPaymentMethod))
          }
        >
          <SelectTrigger className="bg-zinc-950/60">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {DETAILING_PAYMENT_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {t(`paymentMethods.${method}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="pb-28 lg:pb-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="text-sm text-zinc-400">{t("newOrderProgress", { done: requiredComplete })}</p>
        <div className="flex gap-1.5">
          {[sectionStatus.customer, sectionStatus.vehicle, sectionStatus.services, sectionStatus.appointment].map(
            (done, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 w-8 rounded-full transition-colors",
                  done ? "bg-emerald-500" : "bg-zinc-700"
                )}
              />
            )
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="space-y-5">
          <DetailingSection
            title={t("sections.customer")}
            description={t("sectionDescriptions.customer")}
            className="border-zinc-800/80 bg-zinc-900/50"
            action={<SectionIcon done={sectionStatus.customer} />}
          >
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 transition hover:border-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-zinc-600 bg-zinc-900"
                  checked={isInternalVehicle}
                  onChange={(e) => setIsInternalVehicle(e.target.checked)}
                />
                <span>
                  <span className="flex items-center gap-2 font-medium text-white">
                    <Car className="h-4 w-4 text-zinc-400" />
                    {t("internalVehicle")}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500">
                    {t("internalVehicleHint")}
                  </span>
                </span>
              </label>
              {!isInternalVehicle ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">{t("fields.firstName")}</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(e.target.value)}
                      className="bg-zinc-950/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">{t("fields.lastName")}</Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                      className="bg-zinc-950/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t("fields.phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bg-zinc-950/60"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </DetailingSection>

          <DetailingSection
            title={t("sections.vehicle")}
            description={t("sectionDescriptions.vehicle")}
            className="border-zinc-800/80 bg-zinc-900/50"
            action={<SectionIcon done={sectionStatus.vehicle} />}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="makeModel">{t("fields.makeModel")} *</Label>
                  <Input
                    id="makeModel"
                    value={vehicleMakeModel}
                    onChange={(e) => setVehicleMakeModel(e.target.value)}
                    placeholder="BMW X5, Škoda Octavia…"
                    className="bg-zinc-950/60"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="registration">{t("fields.registration")} *</Label>
                  <Input
                    id="registration"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="1AB 2345"
                    className="bg-zinc-950/60 uppercase"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.vehicleSize")}</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {VEHICLE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setVehicleSize(size)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition",
                        vehicleSize === size
                          ? "border-red-500/60 bg-red-500/10 text-white ring-1 ring-red-500/30"
                          : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700"
                      )}
                    >
                      {t(`vehicleSizes.${size}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DetailingSection>

          <DetailingSection
            title={`${t("sections.services")} *`}
            description={t("sectionDescriptions.services")}
            className="border-zinc-800/80 bg-zinc-900/50"
            action={<SectionIcon done={sectionStatus.services} />}
          >
            {employeeLoadFailed ? (
              <p className="mb-4 rounded-lg border border-amber-600/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
                {t("employeesLoadFailed")}
              </p>
            ) : null}
            <DetailingServicePicker
              services={services}
              employees={employees}
              lines={lines}
              onChange={setLines}
              catalogueLoadFailed={servicesLoadFailed}
            />
          </DetailingSection>

          <DetailingSection
            title={t("sections.appointment")}
            description={t("sectionDescriptions.appointment")}
            className="border-zinc-800/80 bg-zinc-900/50"
            action={<SectionIcon done={sectionStatus.appointment} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">{t("fields.date")} *</Label>
                <Input
                  id="date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="bg-zinc-950/60"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">{t("fields.time")} *</Label>
                <Input
                  id="time"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="bg-zinc-950/60"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="expected">{t("fields.expectedCompletion")}</Label>
                <Input
                  id="expected"
                  type="datetime-local"
                  value={expectedCompletion}
                  onChange={(e) => setExpectedCompletion(e.target.value)}
                  className="bg-zinc-950/60"
                />
              </div>
            </div>
          </DetailingSection>

          <DetailingSection
            title={t("sections.finance")}
            description={t("sectionDescriptions.finance")}
            className="border-zinc-800/80 bg-zinc-900/50 xl:hidden"
            action={<Wallet className="h-5 w-5 text-zinc-500" aria-hidden />}
          >
            {financeSummary}
            <div className="mt-4 border-t border-zinc-800 pt-4">{financeInputs}</div>
          </DetailingSection>

          <DetailingSection
            title={t("sections.notes")}
            description={t("sectionDescriptions.notes")}
            className="border-zinc-800/80 bg-zinc-900/50"
            action={<FileText className="h-5 w-5 text-zinc-500" aria-hidden />}
          >
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t("notesPlaceholder")}
              className="min-h-[100px] resize-y bg-zinc-950/60"
            />
          </DetailingSection>
        </div>

        <aside className="hidden space-y-5 xl:sticky xl:top-6 xl:block">
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-xl shadow-black/20">
            <div className="border-b border-zinc-800/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-red-400" />
                <h2 className="font-semibold text-white">{t("sections.finance")}</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{t("sectionDescriptions.finance")}</p>
            </div>
            <div className="space-y-5 p-5">
              {financeSummary}
              {financeInputs}
            </div>
            <div className="space-y-3 border-t border-zinc-800/80 bg-zinc-950/40 p-5">
              {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                size="lg"
                className="h-14 w-full text-base font-semibold shadow-lg shadow-red-950/30"
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t("createOrder")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/detailing/orders")}
                disabled={isPending}
                size="lg"
                className="h-11 w-full"
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur-md xl:hidden">
        {error ? (
          <p className="mb-2 text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-500">{t("fields.finalPrice")}</p>
            <p className="truncate text-2xl font-bold tabular-nums text-white">
              {formatCurrency(pricing.finalPrice)}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="h-12 min-w-[9rem] flex-1 text-base font-semibold"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {t("createOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}
