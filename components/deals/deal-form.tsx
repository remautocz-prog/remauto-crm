"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  createDealAction,
  generateAmountInWordsAction,
  updateDealAction,
} from "@/lib/actions/deals";
import { calculateDealPayment } from "@/lib/deals/finance";
import {
  DEAL_CURRENCIES,
  DEAL_PAYMENT_METHODS,
  DEAL_PAYMENT_PAYERS,
  DEAL_PAYMENT_STATUSES,
} from "@/lib/constants/deals";
import type { ClientOption, Profile } from "@/lib/types/cars";
import type { DealFormInput, DealWithRelations } from "@/lib/types/deals";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CarOption = {
  id: number;
  brand: string;
  model: string;
  year: number;
  vin: string | null;
  registration_number: string | null;
};

type DealFormProps = {
  mode: "create" | "edit";
  deal?: DealWithRelations;
  clients: ClientOption[];
  cars: CarOption[];
  profiles: Profile[];
  initialClientId?: number | null;
  initialVehicleAId?: number | null;
};

function emptyExternal() {
  return {
    make: "",
    model: "",
    vin: "",
    registration_plate: "",
    first_registration_date: "",
    mileage: "",
    fuel_type: "",
    engine_capacity: "",
    power_kw: "",
    color: "",
    technical_certificate_number: "",
    key_count: "",
    agreed_value: "",
    year: String(new Date().getFullYear()),
  };
}

export function DealForm({
  mode,
  deal,
  clients,
  cars,
  profiles,
  initialClientId,
  initialVehicleAId,
}: DealFormProps) {
  const t = useTranslations("deals");
  const tPayer = useTranslations("deals.payer");
  const tPayment = useTranslations("deals.paymentStatuses");
  const tMethod = useTranslations("deals.paymentMethods");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const [form, setForm] = useState<DealFormInput>(() => ({
    deal_type: deal?.deal_type ?? "vehicle_exchange_with_additional_payment",
    client_id: deal?.client_id ?? initialClientId ?? null,
    vehicle_a_id: deal?.vehicle_a_id ?? initialVehicleAId ?? null,
    vehicle_b_id: deal?.vehicle_b_id ?? null,
    vehicle_a_source: deal?.vehicle_a_source ?? "crm",
    vehicle_b_source: deal?.vehicle_b_source ?? "crm",
    vehicle_a_value: deal?.vehicle_a_value ?? null,
    vehicle_b_value: deal?.vehicle_b_value ?? null,
    additional_payment: deal?.additional_payment ?? null,
    additional_payment_words: deal?.additional_payment_words ?? "",
    currency: deal?.currency ?? "CZK",
    additional_payment_payer: deal?.additional_payment_payer ?? "none",
    payment_method: deal?.payment_method ?? null,
    payment_account: deal?.payment_account ?? "",
    payment_due_date: deal?.payment_due_date ?? "",
    payment_status: deal?.payment_status ?? "not_applicable",
    custom_payment_method: deal?.custom_payment_method ?? "",
    signing_place: deal?.signing_place ?? "",
    signing_date: deal?.signing_date ?? "",
    vehicle_a_known_defects: deal?.vehicle_a_known_defects ?? "",
    vehicle_b_known_defects: deal?.vehicle_b_known_defects ?? "",
    legal_defects_notes: deal?.legal_defects_notes ?? "",
    service_budget: deal?.service_budget ?? null,
    additional_terms: deal?.additional_terms ?? "",
    handover_date: deal?.handover_date ?? "",
    handover_time: deal?.handover_time ?? "",
    handover_place: deal?.handover_place ?? "",
    handover_notes: deal?.handover_notes ?? "",
    assigned_to: deal?.assigned_to ?? null,
  }));

  const [vehicleBExternal, setVehicleBExternal] = useState(emptyExternal);

  const paymentCalc = useMemo(
    () => calculateDealPayment(form.vehicle_a_value, form.vehicle_b_value),
    [form.vehicle_a_value, form.vehicle_b_value]
  );

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      additional_payment_payer: paymentCalc.suggestedPayer,
      additional_payment: paymentCalc.suggestedAdditionalPayment,
      payment_status:
        paymentCalc.suggestedPayer === "none" ? "not_applicable" : prev.payment_status === "not_applicable" ? "unpaid" : prev.payment_status,
    }));
  }, [paymentCalc.suggestedPayer, paymentCalc.suggestedAdditionalPayment]);

  function submit() {
    startTransition(async () => {
      setError(null);
      const payload: DealFormInput = {
        ...form,
        vehicle_b_external:
          form.vehicle_b_source === "external"
            ? {
                make: vehicleBExternal.make,
                model: vehicleBExternal.model,
                vin: vehicleBExternal.vin || null,
                registration_plate: vehicleBExternal.registration_plate || null,
                first_registration_date: vehicleBExternal.first_registration_date || null,
                mileage: vehicleBExternal.mileage ? Number(vehicleBExternal.mileage) : null,
                fuel_type: vehicleBExternal.fuel_type || null,
                engine_capacity: vehicleBExternal.engine_capacity || null,
                power_kw: vehicleBExternal.power_kw ? Number(vehicleBExternal.power_kw) : null,
                color: vehicleBExternal.color || null,
                technical_certificate_number: vehicleBExternal.technical_certificate_number || null,
                key_count: vehicleBExternal.key_count ? Number(vehicleBExternal.key_count) : null,
                agreed_value: vehicleBExternal.agreed_value
                  ? Number(vehicleBExternal.agreed_value)
                  : form.vehicle_b_value ?? null,
                year: vehicleBExternal.year ? Number(vehicleBExternal.year) : null,
              }
            : null,
      };

      const result =
        mode === "create"
          ? await createDealAction(payload)
          : await updateDealAction(deal!.id, payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (mode === "create" && result.data?.id) {
        router.push(`/deals/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function generateWords() {
    startTransition(async () => {
      const result = await generateAmountInWordsAction({
        amount: form.additional_payment ?? null,
        currency: form.currency ?? "CZK",
        locale: "cs",
      });
      if (result.success && result.data) {
        setForm((prev) => ({ ...prev, additional_payment_words: result.data!.words }));
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("sections.dealInfo")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {deal?.deal_number ? (
            <div><Label>{t("dealNumber")}</Label><Input value={deal.deal_number} disabled /></div>
          ) : null}
          <div>
            <Label>{t("dealType")}</Label>
            <Input value={t("exchangeWithAdditionalPayment")} disabled />
          </div>
          <div>
            <Label>{t("signingDate")}</Label>
            <Input type="date" value={form.signing_date ?? ""} onChange={(e) => setForm({ ...form, signing_date: e.target.value })} />
          </div>
          <div>
            <Label>{t("signingPlace")}</Label>
            <Input value={form.signing_place ?? ""} onChange={(e) => setForm({ ...form, signing_place: e.target.value })} />
          </div>
          <div>
            <Label>{t("assignedEmployee")}</Label>
            <Select value={form.assigned_to ?? "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("unassigned")}</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-white">{t("sections.customer")}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setClientDialogOpen(true)}>{t("createClient")}</Button>
        </CardHeader>
        <CardContent>
          <Select value={form.client_id ? String(form.client_id) : "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? null : Number(v) })}>
            <SelectTrigger><SelectValue placeholder={t("selectClient")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("selectClient")}</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("vehicleA")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Select value={form.vehicle_a_id ? String(form.vehicle_a_id) : "none"} onValueChange={(v) => setForm({ ...form, vehicle_a_id: v === "none" ? null : Number(v), vehicle_a_source: "crm" })}>
              <SelectTrigger><SelectValue placeholder={t("selectVehicle")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("selectVehicle")}</SelectItem>
                {cars.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.brand} {c.model} ({c.year})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("agreedVehicleValue")}</Label>
            <Input type="number" min={0} step="0.01" value={form.vehicle_a_value ?? ""} onChange={(e) => setForm({ ...form, vehicle_a_value: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("vehicleB")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={form.vehicle_b_source} onValueChange={(v) => setForm({ ...form, vehicle_b_source: v as "crm" | "external", vehicle_b_id: v === "external" ? null : form.vehicle_b_id })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="crm">{t("selectVehicle")}</SelectItem>
              <SelectItem value="external">{t("enterVehicleManually")}</SelectItem>
            </SelectContent>
          </Select>
          {form.vehicle_b_source === "crm" ? (
            <Select value={form.vehicle_b_id ? String(form.vehicle_b_id) : "none"} onValueChange={(v) => setForm({ ...form, vehicle_b_id: v === "none" ? null : Number(v) })}>
              <SelectTrigger><SelectValue placeholder={t("selectVehicle")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("selectVehicle")}</SelectItem>
                {cars.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.brand} {c.model}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(["make", "model", "vin", "registration_plate", "year", "mileage", "fuel_type", "engine_capacity", "power_kw", "color", "technical_certificate_number", "key_count", "agreed_value"] as const).map((key) => (
                <div key={key}>
                  <Label>{t(`vehicleFields.${key}` as never)}</Label>
                  <Input value={vehicleBExternal[key]} onChange={(e) => setVehicleBExternal({ ...vehicleBExternal, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <div>
            <Label>{t("agreedVehicleValue")}</Label>
            <Input type="number" min={0} step="0.01" value={form.vehicle_b_value ?? ""} onChange={(e) => setForm({ ...form, vehicle_b_value: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("sections.payment")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>{t("suggestedPayer")}</Label><Input value={tPayer(paymentCalc.suggestedPayer)} disabled /></div>
          <div>
            <Label>{t("additionalPaymentPayer")}</Label>
            <Select value={form.additional_payment_payer ?? "none"} onValueChange={(v) => setForm({ ...form, additional_payment_payer: v as typeof form.additional_payment_payer })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEAL_PAYMENT_PAYERS.map((p) => <SelectItem key={p} value={p}>{tPayer(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("additionalPayment")}</Label>
            <Input type="number" min={0} step="0.01" value={form.additional_payment ?? ""} onChange={(e) => setForm({ ...form, additional_payment: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label>{t("currency")}</Label>
            <Select value={form.currency ?? "CZK"} onValueChange={(v) => setForm({ ...form, currency: v as "CZK" | "EUR" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEAL_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>{t("amountInWords")}</Label>
            <div className="flex gap-2">
              <Input value={form.additional_payment_words ?? ""} onChange={(e) => setForm({ ...form, additional_payment_words: e.target.value })} />
              <Button type="button" variant="outline" onClick={generateWords}>{t("generateWords")}</Button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{t("documentOnlyValue")}</p>
          </div>
          <div>
            <Label>{t("paymentMethod")}</Label>
            <Select value={form.payment_method ?? "none"} onValueChange={(v) => setForm({ ...form, payment_method: v === "none" ? null : v as typeof form.payment_method })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {DEAL_PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{tMethod(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("paymentStatus")}</Label>
            <Select value={form.payment_status ?? "unpaid"} onValueChange={(v) => setForm({ ...form, payment_status: v as typeof form.payment_status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEAL_PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{tPayment(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t("paymentAccount")}</Label><Input value={form.payment_account ?? ""} onChange={(e) => setForm({ ...form, payment_account: e.target.value })} /></div>
          <div><Label>{t("paymentDueDate")}</Label><Input type="date" value={form.payment_due_date ?? ""} onChange={(e) => setForm({ ...form, payment_due_date: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("sections.legal")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div><Label>{t("vehicleAKnownDefects")}</Label><Textarea value={form.vehicle_a_known_defects ?? ""} onChange={(e) => setForm({ ...form, vehicle_a_known_defects: e.target.value })} /></div>
          <div><Label>{t("vehicleBKnownDefects")}</Label><Textarea value={form.vehicle_b_known_defects ?? ""} onChange={(e) => setForm({ ...form, vehicle_b_known_defects: e.target.value })} /></div>
          <div><Label>{t("legalDefects")}</Label><Textarea value={form.legal_defects_notes ?? ""} onChange={(e) => setForm({ ...form, legal_defects_notes: e.target.value })} /></div>
          <div><Label>{t("approvedServiceBudget")}</Label><Input type="number" min={0} value={form.service_budget ?? ""} onChange={(e) => setForm({ ...form, service_budget: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>{t("additionalTerms")}</Label><Textarea value={form.additional_terms ?? ""} onChange={(e) => setForm({ ...form, additional_terms: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader><CardTitle className="text-base text-white">{t("handover")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>{t("handoverDate")}</Label><Input type="date" value={form.handover_date ?? ""} onChange={(e) => setForm({ ...form, handover_date: e.target.value })} /></div>
          <div><Label>{t("handoverTime")}</Label><Input type="time" value={form.handover_time ?? ""} onChange={(e) => setForm({ ...form, handover_time: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>{t("handoverPlace")}</Label><Input value={form.handover_place ?? ""} onChange={(e) => setForm({ ...form, handover_place: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>{t("handoverNotes")}</Label><Textarea value={form.handover_notes ?? ""} onChange={(e) => setForm({ ...form, handover_notes: e.target.value })} /></div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? t("createDeal") : t("saveDeal")}
        </Button>
      </div>

      <ClientFormDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} mode="create" />
    </div>
  );
}
