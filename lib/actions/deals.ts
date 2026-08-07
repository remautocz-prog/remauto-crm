"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SIGNED_DEAL_STATUSES } from "@/lib/constants/deals";
import { formatAmountInWords } from "@/lib/deals/amount-in-words";
import {
  calculateDealPayment,
  defaultPaymentStatus,
  normalizePayerForPayment,
  parseMoneyInput,
  roundMoney,
} from "@/lib/deals/finance";
import {
  buildClientSnapshot,
  buildCompanySnapshot,
  buildVehicleSnapshotFromCar,
  buildVehicleSnapshotFromExternal,
} from "@/lib/deals/snapshots";
import {
  areBothHandoverSidesComplete,
  collectHandoverInputValidationIssues,
  normalizeHandoverSideInput,
} from "@/lib/deals/handover";
import {
  canTransitionStatus,
  collectDealValidationIssues,
} from "@/lib/deals/validation";
import { getCarById } from "@/lib/queries/cars";
import { getClientById } from "@/lib/queries/clients";
import { getCompanySettings } from "@/lib/queries/document-templates";
import {
  allocateDealNumber,
  getDealById,
} from "@/lib/queries/deals";
import { createClient } from "@/lib/supabase/server";
import { newEntityUuid } from "@/lib/supabase/safe-insert";
import type { AppLocale } from "@/i18n/config";
import type { DealFormInput, DealHandoverSideInput } from "@/lib/types/deals";
import type { DealPaymentStatus, DealStatus } from "@/lib/constants/deals";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";
import { createCarAction } from "@/lib/actions/cars";
import { guardPermission } from "@/lib/auth/action-guard";

function revalidateDealPaths(dealId: string, clientId?: number | null, vehicleAId?: number | null, vehicleBId?: number | null) {
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  if (vehicleAId) revalidatePath(`/cars/${vehicleAId}`);
  if (vehicleBId) revalidatePath(`/cars/${vehicleBId}`);
}

async function resolveVehicleSnapshot(
  source: "crm" | "external",
  carId: number | null | undefined,
  external: DealFormInput["vehicle_b_external"],
  agreedValue: number | null | undefined
) {
  if (source === "crm") {
    if (!carId) return null;
    const car = await getCarById(carId);
    return buildVehicleSnapshotFromCar(car, agreedValue);
  }
  if (!external) return buildVehicleSnapshotFromExternal({ make: "", model: "" });
  return buildVehicleSnapshotFromExternal({ ...external, agreed_value: agreedValue ?? external.agreed_value });
}

async function buildDealPayload(input: DealFormInput, existing?: Awaited<ReturnType<typeof getDealById>>) {
  const vehicleAValue = parseMoneyInput(input.vehicle_a_value);
  const vehicleBValue = parseMoneyInput(input.vehicle_b_value);
  const paymentCalc = calculateDealPayment(vehicleAValue, vehicleBValue);

  const additionalPayment =
    parseMoneyInput(input.additional_payment) ?? paymentCalc.suggestedAdditionalPayment;
  const payer = normalizePayerForPayment(
    input.additional_payment_payer ?? paymentCalc.suggestedPayer,
    additionalPayment
  );

  const vehicleASource = input.vehicle_a_source ?? "crm";
  const vehicleBSource = input.vehicle_b_source ?? "crm";

  const useSnapshots =
    existing && SIGNED_DEAL_STATUSES.includes(existing.status) && existing.signed_at;

  let vehicleASnapshot = existing?.vehicle_a_snapshot;
  let vehicleBSnapshot = existing?.vehicle_b_snapshot;
  let clientSnapshot = existing?.client_snapshot;
  let companySnapshot = existing?.company_snapshot;

  if (!useSnapshots) {
    vehicleASnapshot =
      (await resolveVehicleSnapshot(
        vehicleASource,
        input.vehicle_a_id,
        input.vehicle_a_external,
        vehicleAValue
      )) ?? existing?.vehicle_a_snapshot;
    vehicleBSnapshot =
      (await resolveVehicleSnapshot(
        vehicleBSource,
        input.vehicle_b_id,
        input.vehicle_b_external,
        vehicleBValue
      )) ?? existing?.vehicle_b_snapshot;

    if (input.client_id) {
      const client = await getClientById(input.client_id);
      if (client) clientSnapshot = buildClientSnapshot(client);
    }
    const company = await getCompanySettings();
    companySnapshot = buildCompanySnapshot(company);
  }

  const locale = "cs" as AppLocale;
  const amountWords =
    input.additional_payment_words?.trim() ||
    (additionalPayment
      ? formatAmountInWords(additionalPayment, input.currency ?? "CZK", locale)
      : "");

  return {
    client_id: input.client_id ?? null,
    vehicle_a_id: vehicleASource === "crm" ? input.vehicle_a_id ?? null : null,
    vehicle_b_id: vehicleBSource === "crm" ? input.vehicle_b_id ?? null : null,
    vehicle_a_source: vehicleASource,
    vehicle_b_source: vehicleBSource,
    vehicle_a_snapshot: vehicleASnapshot ?? {},
    vehicle_b_snapshot: vehicleBSnapshot ?? {},
    client_snapshot: clientSnapshot ?? {},
    company_snapshot: companySnapshot ?? {},
    vehicle_a_value: vehicleAValue,
    vehicle_b_value: vehicleBValue,
    additional_payment: additionalPayment,
    additional_payment_words: amountWords || null,
    currency: input.currency ?? "CZK",
    additional_payment_payer: payer,
    payment_method: payer === "none" ? null : input.payment_method ?? null,
    payment_account: input.payment_account?.trim() || null,
    payment_due_date: input.payment_due_date || null,
    payment_status:
      input.payment_status ??
      defaultPaymentStatus(payer, additionalPayment),
    custom_payment_method: input.custom_payment_method?.trim() || null,
    signing_place: input.signing_place?.trim() || null,
    signing_date: input.signing_date || null,
    vehicle_a_known_defects: input.vehicle_a_known_defects?.trim() || null,
    vehicle_b_known_defects: input.vehicle_b_known_defects?.trim() || null,
    legal_defects_notes: input.legal_defects_notes?.trim() || null,
    service_budget: parseMoneyInput(input.service_budget),
    additional_terms: input.additional_terms?.trim() || null,
    handover_date: input.handover_date || null,
    handover_time: input.handover_time || null,
    handover_place: input.handover_place?.trim() || null,
    handover_notes: input.handover_notes?.trim() || null,
    assigned_to: input.assigned_to || null,
  };
}

export async function createDealAction(
  input: DealFormInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await guardPermission<{ id: string }>("deals.create");
  if (denied) return denied;
  const issues = collectDealValidationIssues(input, { phase: "prepare" });
  if (issues.length > 0) {
    const t = await getTranslations("deals.validation");
    return { success: false, error: t(issues[0]!.messageKey as never) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const dealNumber = await allocateDealNumber(input.deal_type);
  const payload = await buildDealPayload(input);
  const dealId = newEntityUuid();

  const { error } = await supabase
    .from("deals")
    .insert({
      id: dealId,
      deal_number: dealNumber,
      deal_type: input.deal_type,
      status: "draft",
      created_by: user.id,
      ...payload,
    });

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  if (input.save_vehicle_b_to_crm && input.vehicle_b_source === "external" && input.vehicle_b_external) {
    await saveTradeInVehicleToCrmAction(dealId, input.vehicle_b_external, input.client_id ?? null);
  }

  revalidateDealPaths(dealId, payload.client_id, payload.vehicle_a_id, payload.vehicle_b_id);
  return { success: true, data: { id: dealId } };
}

export async function updateDealAction(
  dealId: string,
  input: DealFormInput
): Promise<ActionResult> {
  const denied = await guardPermission("deals.update");
  if (denied) return denied;
  const existing = await getDealById(dealId);
  if (!existing) return { success: false, error: "Deal not found" };
  if (existing.archived_at) return { success: false, error: "Deal is archived" };
  if (!["draft", "prepared"].includes(existing.status) && existing.signed_at) {
    const payload = await buildDealPayload(input, existing);
    const limitedUpdate = {
      payment_method: payload.payment_method,
      payment_account: payload.payment_account,
      payment_due_date: payload.payment_due_date,
      payment_status: payload.payment_status,
      custom_payment_method: payload.custom_payment_method,
      handover_date: payload.handover_date,
      handover_time: payload.handover_time,
      handover_place: payload.handover_place,
      handover_notes: payload.handover_notes,
      assigned_to: payload.assigned_to,
      additional_payment_words: payload.additional_payment_words,
    };
    const supabase = await createClient();
    const { error } = await supabase.from("deals").update(limitedUpdate).eq("id", dealId);
    if (error) return { success: false, error: await formatSupabaseError(error) };
    revalidateDealPaths(dealId, existing.client_id, existing.vehicle_a_id, existing.vehicle_b_id);
    return { success: true };
  }

  const issues = collectDealValidationIssues(input, { phase: "prepare" });
  if (issues.length > 0) {
    const t = await getTranslations("deals.validation");
    return { success: false, error: t(issues[0]!.messageKey as never) };
  }

  const payload = await buildDealPayload(input, existing);
  const supabase = await createClient();
  const { error } = await supabase.from("deals").update(payload).eq("id", dealId);
  if (error) return { success: false, error: await formatSupabaseError(error) };

  revalidateDealPaths(dealId, payload.client_id, payload.vehicle_a_id, payload.vehicle_b_id);
  return { success: true };
}

export async function updateDealStatusAction(
  dealId: string,
  status: DealStatus,
  options?: { cancelled_reason?: string; locale?: AppLocale }
): Promise<ActionResult> {
  const denied = await guardPermission("deals.update");
  if (denied) return denied;
  const existing = await getDealById(dealId);
  if (!existing) return { success: false, error: "Deal not found" };
  if (!canTransitionStatus(existing.status, status)) {
    return { success: false, error: "Invalid status transition" };
  }

  const supabase = await createClient();
  const update: Record<string, unknown> = { status };

  if (status === "prepared") {
    const issues = collectDealValidationIssues(
      {
        deal_type: existing.deal_type,
        client_id: existing.client_id,
        vehicle_a_id: existing.vehicle_a_id,
        vehicle_b_id: existing.vehicle_b_id,
        vehicle_a_source: existing.vehicle_a_source,
        vehicle_b_source: existing.vehicle_b_source,
        vehicle_a_value: existing.vehicle_a_value,
        vehicle_b_value: existing.vehicle_b_value,
        currency: existing.currency,
        additional_payment_payer: existing.additional_payment_payer,
        additional_payment: existing.additional_payment,
      },
      { phase: "prepare" }
    );
    if (issues.length > 0) {
      const t = await getTranslations("deals.validation");
      return { success: false, error: t(issues[0]!.messageKey as never) };
    }
  }

  if (status === "signed") {
    const issues = collectDealValidationIssues(
      {
        deal_type: existing.deal_type,
        client_id: existing.client_id,
        vehicle_a_id: existing.vehicle_a_id,
        vehicle_b_id: existing.vehicle_b_id,
        vehicle_a_source: existing.vehicle_a_source,
        vehicle_b_source: existing.vehicle_b_source,
        vehicle_a_value: existing.vehicle_a_value,
        vehicle_b_value: existing.vehicle_b_value,
        currency: existing.currency,
        additional_payment_payer: existing.additional_payment_payer,
        additional_payment: existing.additional_payment,
        signing_date: existing.signing_date,
        signing_place: existing.signing_place,
        payment_method: existing.payment_method,
      },
      { phase: "sign" }
    );
    if (issues.length > 0) {
      const t = await getTranslations("deals.validation");
      return { success: false, error: t(issues[0]!.messageKey as never) };
    }

    const client = existing.client_id ? await getClientById(existing.client_id) : null;
    const company = await getCompanySettings();
    let vehicleASnapshot = existing.vehicle_a_snapshot;
    let vehicleBSnapshot = existing.vehicle_b_snapshot;

    if (existing.vehicle_a_source === "crm" && existing.vehicle_a_id) {
      vehicleASnapshot = buildVehicleSnapshotFromCar(
        await getCarById(existing.vehicle_a_id),
        existing.vehicle_a_value
      );
    }
    if (existing.vehicle_b_source === "crm" && existing.vehicle_b_id) {
      vehicleBSnapshot = buildVehicleSnapshotFromCar(
        await getCarById(existing.vehicle_b_id),
        existing.vehicle_b_value
      );
    }

    update.signed_at = new Date().toISOString();
    update.client_snapshot = client ? buildClientSnapshot(client) : existing.client_snapshot;
    update.company_snapshot = buildCompanySnapshot(company);
    update.vehicle_a_snapshot = vehicleASnapshot;
    update.vehicle_b_snapshot = vehicleBSnapshot;
    update.additional_payment_words =
      existing.additional_payment_words ||
      formatAmountInWords(
        existing.additional_payment,
        existing.currency,
        options?.locale ?? "cs"
      );
  }

  if (status === "completed") {
    const issues = collectDealValidationIssues(
      {
        deal_type: existing.deal_type,
        client_id: existing.client_id,
        handover_date: existing.handover_date,
        handover_place: existing.handover_place,
        payment_status: existing.payment_status,
      },
      { phase: "complete" }
    );
    if (issues.length > 0) {
      const t = await getTranslations("deals.validation");
      return { success: false, error: t(issues[0]!.messageKey as never) };
    }
    if (!areBothHandoverSidesComplete(existing.handover_details)) {
      const t = await getTranslations("deals.handoverPanel");
      return { success: false, error: t("handoverIncomplete") };
    }
  }

  if (status === "cancelled") {
    if (!options?.cancelled_reason?.trim()) {
      return { success: false, error: "Cancellation reason required" };
    }
    update.cancelled_reason = options.cancelled_reason.trim();
  }

  if (status === "archived") {
    update.archived_at = new Date().toISOString();
  }

  const { error } = await supabase.from("deals").update(update).eq("id", dealId);
  if (error) return { success: false, error: await formatSupabaseError(error) };

  revalidateDealPaths(dealId, existing.client_id, existing.vehicle_a_id, existing.vehicle_b_id);
  return { success: true };
}

export async function refreshDealSnapshotAction(dealId: string): Promise<ActionResult> {
  const denied = await guardPermission("deals.update");
  if (denied) return denied;
  const existing = await getDealById(dealId);
  if (!existing) return { success: false, error: "Deal not found" };

  const client = existing.client_id ? await getClientById(existing.client_id) : null;
  const company = await getCompanySettings();

  let vehicleASnapshot = existing.vehicle_a_snapshot;
  let vehicleBSnapshot = existing.vehicle_b_snapshot;

  if (existing.vehicle_a_source === "crm" && existing.vehicle_a_id) {
    vehicleASnapshot = buildVehicleSnapshotFromCar(
      await getCarById(existing.vehicle_a_id),
      existing.vehicle_a_value
    );
  }
  if (existing.vehicle_b_source === "crm" && existing.vehicle_b_id) {
    vehicleBSnapshot = buildVehicleSnapshotFromCar(
      await getCarById(existing.vehicle_b_id),
      existing.vehicle_b_value
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({
      client_snapshot: client ? buildClientSnapshot(client) : existing.client_snapshot,
      company_snapshot: buildCompanySnapshot(company),
      vehicle_a_snapshot: vehicleASnapshot,
      vehicle_b_snapshot: vehicleBSnapshot,
    })
    .eq("id", dealId);

  if (error) return { success: false, error: await formatSupabaseError(error) };
  revalidateDealPaths(dealId, existing.client_id, existing.vehicle_a_id, existing.vehicle_b_id);
  return { success: true };
}

export async function updateDealPaymentAction(
  dealId: string,
  input: {
    payment_status: DealPaymentStatus;
    payment_method?: string | null;
    payment_account?: string | null;
    payment_due_date?: string | null;
    markPaid?: boolean;
  }
): Promise<ActionResult> {
  const denied = await guardPermission("deals.update");
  if (denied) return denied;
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    payment_status: input.payment_status,
    payment_method: input.payment_method ?? null,
    payment_account: input.payment_account ?? null,
    payment_due_date: input.payment_due_date ?? null,
  };

  if (input.markPaid || input.payment_status === "paid") {
    update.payment_paid_at = new Date().toISOString();
    update.payment_status = "paid";
  }

  const { error } = await supabase.from("deals").update(update).eq("id", dealId);
  if (error) return { success: false, error: await formatSupabaseError(error) };

  const deal = await getDealById(dealId);
  revalidateDealPaths(dealId, deal?.client_id, deal?.vehicle_a_id, deal?.vehicle_b_id);
  return { success: true };
}

export async function archiveDealAction(dealId: string, archived: boolean): Promise<ActionResult> {
  const denied = await guardPermission("deals.archive");
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      status: archived ? "archived" : "draft",
    })
    .eq("id", dealId);

  if (error) return { success: false, error: await formatSupabaseError(error) };

  const deal = await getDealById(dealId);
  revalidateDealPaths(dealId, deal?.client_id, deal?.vehicle_a_id, deal?.vehicle_b_id);
  return { success: true };
}

export async function saveTradeInVehicleToCrmAction(
  dealId: string,
  external: NonNullable<DealFormInput["vehicle_b_external"]>,
  clientId: number | null
): Promise<ActionResult<{ carId: number }>> {
  const denied = await guardPermission<{ carId: number }>("deals.update");
  if (denied) return denied;
  const result = await createCarAction({
    brand: external.make,
    model: external.model,
    year: external.year ?? new Date().getFullYear(),
    vin: external.vin ?? null,
    registration_number: external.registration_plate ?? null,
    color: external.color ?? null,
    status: "in_stock",
    business_model: "owned",
    client_id: clientId,
    first_registration_date: external.first_registration_date ?? null,
    fuel_type: external.fuel_type ?? null,
    engine_capacity: external.engine_capacity ?? null,
    power_kw: external.power_kw ?? null,
    technical_certificate_number: external.technical_certificate_number ?? null,
    key_count: external.key_count ?? null,
    mileage: external.mileage ?? null,
    purchase_price: external.agreed_value ?? null,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      error: !result.success ? result.error : "Failed to save vehicle",
    };
  }

  const supabase = await createClient();
  const car = await getCarById(result.data.id);
  const snapshot = buildVehicleSnapshotFromCar(car, external.agreed_value ?? null);

  await supabase
    .from("deals")
    .update({
      vehicle_b_id: result.data.id,
      vehicle_b_source: "crm",
      vehicle_b_snapshot: snapshot,
    })
    .eq("id", dealId);

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/cars");
  return { success: true, data: { carId: result.data.id } };
}

export async function createDealAndRedirectAction(input: DealFormInput) {
  const denied = await guardPermission("deals.create");
  if (denied) return denied;
  const result = await createDealAction(input);
  if (!result.success || !result.data) {
    return result;
  }
  redirect(`/deals/${result.data.id}`);
}

export async function calculateDealPaymentPreviewAction(
  vehicleAValue: number | null,
  vehicleBValue: number | null
): Promise<ActionResult<ReturnType<typeof calculateDealPayment>>> {
  const denied = await guardPermission<ReturnType<typeof calculateDealPayment>>("deals.view");
  if (denied) return denied;
  return {
    success: true,
    data: calculateDealPayment(vehicleAValue, vehicleBValue),
  };
}

export async function upsertDealHandoverAction(
  input: DealHandoverSideInput
): Promise<ActionResult> {
  const denied = await guardPermission("deals.update");
  if (denied) return denied;
  const deal = await getDealById(input.deal_id);
  if (!deal) {
    return { success: false, error: "Deal not found" };
  }

  const issues = collectHandoverInputValidationIssues(input);
  if (issues.length > 0) {
    const t = await getTranslations("deals.handoverPanel.validation");
    return { success: false, error: t(issues[0]!.messageKey as never) };
  }

  const payload = normalizeHandoverSideInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("deal_handover_details").upsert(
    {
      deal_id: payload.deal_id,
      vehicle_side: payload.vehicle_side,
      handover_datetime: payload.handover_datetime,
      mileage: payload.mileage,
      fuel_level: payload.fuel_level,
      key_count: payload.key_count,
      documents: payload.documents,
      accessories: payload.accessories,
      visible_damage: payload.visible_damage,
      notes: payload.notes,
    },
    { onConflict: "deal_id,vehicle_side" }
  );

  if (error) {
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidateDealPaths(deal.id, deal.client_id, deal.vehicle_a_id, deal.vehicle_b_id);
  return { success: true };
}

export async function generateAmountInWordsAction(input: {
  amount: number | null;
  currency: "CZK" | "EUR";
  locale?: AppLocale;
}): Promise<ActionResult<{ words: string }>> {
  const denied = await guardPermission<{ words: string }>("deals.view");
  if (denied) return denied;
  const words = formatAmountInWords(
    input.amount,
    input.currency,
    input.locale ?? "cs"
  );
  return { success: true, data: { words } };
}
