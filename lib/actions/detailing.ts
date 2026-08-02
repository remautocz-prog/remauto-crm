"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  buildServiceCommissionSnapshot,
  calculateEmployeeCommission,
  calculateServiceCommission,
  resolveCommissionPercent,
  sumServiceCommissions,
  hasServiceLevelAssignments,
} from "@/lib/detailing/commission";
import {
  calculateOrderPricing,
  calculatePaymentStatus,
  calculateRemainingAmount,
  resolveQuickPaymentUpdate,
  roundMoney,
} from "@/lib/detailing/pricing";
import { collectDetailingOrderValidationIssues, collectDetailingDeliverValidationIssues } from "@/lib/detailing/validation";
import {
  allocateDetailingOrderNumber,
  getDetailingEmployeeByProfileId,
  getDetailingOrderById,
  getDetailingServiceById,
} from "@/lib/queries/detailing";
import { getProfileById } from "@/lib/queries/cars";
import { createClient } from "@/lib/supabase/server";
import { DETAILING_EMPLOYEE_FALLBACK_LABEL } from "@/lib/detailing/employee-display";
import type {
  DetailingExpenseCategory,
  DetailingOrderStatus,
  DetailingPaymentMethod,
  DetailingPaymentStatus,
} from "@/lib/constants/detailing";
import type { DetailingOrderFormInput, DetailingOrderServiceInput, DetailingServiceFormInput } from "@/lib/types/detailing";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

function revalidateDetailingPaths(orderId?: string) {
  revalidatePath("/detailing");
  revalidatePath("/detailing/orders");
  revalidatePath("/detailing/finance");
  revalidatePath("/dashboard");
  if (orderId) revalidatePath(`/detailing/orders/${orderId}`);
}

async function resolveEmployeeSnapshot(profileId?: string | null) {
  if (!profileId) {
    return {
      employee_name_snapshot: null as string | null,
      employee_commission_percent_snapshot: null as number | null,
    };
  }

  const [settings, profile] = await Promise.all([
    getDetailingEmployeeByProfileId(profileId),
    getProfileById(profileId),
  ]);

  const displayName =
    profile?.full_name?.trim() ||
    settings?.display_name?.trim() ||
    DETAILING_EMPLOYEE_FALLBACK_LABEL;

  return {
    employee_name_snapshot: displayName,
    employee_commission_percent_snapshot: resolveCommissionPercent(
      settings?.commission_percent
    ),
  };
}

async function buildOrderFinancials(
  input: DetailingOrderFormInput,
  status: DetailingOrderStatus
) {
  const pricing = calculateOrderPricing({
    services: input.services.map((service) => ({
      unit_price: service.unit_price,
      quantity: service.quantity,
      total_price: service.total_price,
      price_type: service.price_type,
    })),
    vehicleSize: input.vehicle_size,
    discountAmount: input.discount_amount,
    finalPriceOverride: input.final_price_override ?? input.final_price,
  });

  const paidAmount = roundMoney(Math.max(input.paid_amount ?? 0, 0));
  const depositAmount = roundMoney(Math.max(input.deposit_amount ?? 0, 0));
  const remainingAmount = calculateRemainingAmount(pricing.finalPrice, paidAmount);
  const paymentStatus = calculatePaymentStatus(pricing.finalPrice, paidAmount);
  const employeeCommissionAmount = sumServiceCommissions(
    input.services.map((service) => ({
      commission_amount: calculateServiceCommission(
        service.total_price,
        resolveCommissionPercent(service.commission_percent),
        status
      ),
    })),
    status
  );

  return {
    ...pricing,
    deposit_amount: depositAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_status: paymentStatus,
    employee_commission_amount: employeeCommissionAmount,
  };
}

async function buildServiceRowsWithCommissions(
  orderId: string,
  services: DetailingOrderServiceInput[],
  status: DetailingOrderStatus,
  preserveSnapshots = false
) {
  const rows = [];

  for (const service of services) {
    let snapshot = buildServiceCommissionSnapshot(
      {
        total_price: service.total_price,
        assigned_employee_id: service.assigned_employee_id,
        commission_percent: service.commission_percent,
        employee_name_snapshot: service.employee_name_snapshot,
      },
      status
    );

    if (service.assigned_employee_id && !service.employee_name_snapshot) {
      const employeeSnapshot = await resolveEmployeeSnapshot(service.assigned_employee_id);
      snapshot = {
        ...snapshot,
        employee_name_snapshot: employeeSnapshot.employee_name_snapshot,
        commission_percent_snapshot:
          service.commission_percent != null
            ? resolveCommissionPercent(service.commission_percent)
            : employeeSnapshot.employee_commission_percent_snapshot,
        commission_amount: calculateServiceCommission(
          service.total_price,
          resolveCommissionPercent(
            service.commission_percent ??
              employeeSnapshot.employee_commission_percent_snapshot
          ),
          status
        ),
      };
    }

    if (preserveSnapshots) {
      snapshot = {
        assigned_employee_id: service.assigned_employee_id ?? null,
        employee_name_snapshot: service.employee_name_snapshot ?? null,
        commission_percent_snapshot: service.commission_percent_snapshot ?? null,
        commission_amount: roundMoney(Math.max(service.commission_amount ?? 0, 0)),
      };
    }

    rows.push({
      order_id: orderId,
      service_id: service.service_id ?? null,
      service_name_snapshot: service.service_name_snapshot.trim(),
      quantity: service.quantity,
      unit_price: service.unit_price,
      total_price: service.total_price,
      notes: service.notes?.trim() || null,
      assigned_employee_id: snapshot.assigned_employee_id,
      employee_name_snapshot: snapshot.employee_name_snapshot,
      commission_percent_snapshot: snapshot.commission_percent_snapshot,
      commission_amount: snapshot.commission_amount,
    });
  }

  return rows;
}

async function translateValidationIssue(code: string) {
  const t = await getTranslations("detailing.validation");
  return t(code as never);
}

export async function createDetailingOrderAction(
  input: DetailingOrderFormInput
): Promise<ActionResult<{ id: string }>> {
  const issues = collectDetailingOrderValidationIssues(input);
  if (issues.length) {
    return { success: false, error: await translateValidationIssue(issues[0]) };
  }

  try {
    const supabase = await createClient();
    const orderNumber = await allocateDetailingOrderNumber();
    const financials = await buildOrderFinancials(input, input.status);

    const actualCompletionAt =
      input.status === "delivered"
        ? input.actual_completion_at ?? new Date().toISOString()
        : input.actual_completion_at ?? null;

    const { data: order, error: orderError } = await supabase
      .from("detailing_orders")
      .insert({
        order_number: orderNumber,
        customer_first_name: input.customer_first_name?.trim() || null,
        customer_last_name: input.customer_last_name?.trim() || null,
        customer_phone: input.customer_phone?.trim() || null,
        vehicle_make_model: input.vehicle_make_model.trim(),
        registration_number: input.registration_number.trim(),
        car_id: input.car_id ?? null,
        vehicle_size: input.vehicle_size,
        surcharge_percent_snapshot: financials.surchargePercent,
        appointment_date: input.appointment_date,
        appointment_time: input.appointment_time,
        expected_completion_at: input.expected_completion_at ?? null,
        actual_completion_at: actualCompletionAt,
        status: input.status,
        notes: input.notes?.trim() || null,
        assigned_employee_id: input.assigned_employee_id ?? null,
        employee_name_snapshot: null,
        employee_commission_percent_snapshot: null,
        employee_commission_amount: financials.employee_commission_amount,
        payment_method: input.payment_method ?? null,
        services_subtotal: financials.servicesSubtotal,
        vehicle_surcharge_amount: financials.vehicleSurchargeAmount,
        discount_amount: financials.discountAmount,
        final_price: financials.finalPrice,
        deposit_amount: financials.deposit_amount,
        paid_amount: financials.paid_amount,
        remaining_amount: financials.remaining_amount,
        payment_status: financials.payment_status,
      })
      .select("id")
      .single();

    if (orderError) {
      return { success: false, error: await formatSupabaseError(orderError) };
    }

    const serviceRows = await buildServiceRowsWithCommissions(
      String(order.id),
      input.services,
      input.status
    );

    const { error: servicesError } = await supabase
      .from("detailing_order_services")
      .insert(serviceRows);

    if (servicesError) {
      return { success: false, error: await formatSupabaseError(servicesError) };
    }

    revalidateDetailingPaths(String(order.id));
    return { success: true, data: { id: String(order.id) } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateDetailingOrderAction(
  orderId: string,
  input: DetailingOrderFormInput
): Promise<ActionResult> {
  const issues = collectDetailingOrderValidationIssues(input);
  if (issues.length) {
    return { success: false, error: await translateValidationIssue(issues[0]) };
  }

  try {
    const existing = await getDetailingOrderById(orderId);
    if (!existing) {
      const t = await getTranslations("detailing");
      return { success: false, error: t("orderNotFound") };
    }

    const supabase = await createClient();
    const financials = await buildOrderFinancials(input, input.status);

    const wasDelivered = existing.status === "delivered";
    const willBeDelivered = input.status === "delivered";
    const preserveCommissionSnapshot = wasDelivered && willBeDelivered;

    const actualCompletionAt =
      input.status === "delivered"
        ? input.actual_completion_at ?? existing.actual_completion_at ?? new Date().toISOString()
        : input.actual_completion_at ?? null;

    const { error: orderError } = await supabase
      .from("detailing_orders")
      .update({
        customer_first_name: input.customer_first_name?.trim() || null,
        customer_last_name: input.customer_last_name?.trim() || null,
        customer_phone: input.customer_phone?.trim() || null,
        vehicle_make_model: input.vehicle_make_model.trim(),
        registration_number: input.registration_number.trim(),
        car_id: input.car_id ?? existing.car_id ?? null,
        vehicle_size: input.vehicle_size,
        surcharge_percent_snapshot: financials.surchargePercent,
        appointment_date: input.appointment_date,
        appointment_time: input.appointment_time,
        expected_completion_at: input.expected_completion_at ?? null,
        actual_completion_at: actualCompletionAt,
        status: input.status,
        notes: input.notes?.trim() || null,
        assigned_employee_id: input.assigned_employee_id ?? null,
        employee_name_snapshot: preserveCommissionSnapshot
          ? existing.employee_name_snapshot
          : null,
        employee_commission_percent_snapshot: preserveCommissionSnapshot
          ? existing.employee_commission_percent_snapshot
          : null,
        employee_commission_amount: preserveCommissionSnapshot
          ? existing.employee_commission_amount
          : financials.employee_commission_amount,
        payment_method: input.payment_method ?? null,
        services_subtotal: financials.servicesSubtotal,
        vehicle_surcharge_amount: financials.vehicleSurchargeAmount,
        discount_amount: financials.discountAmount,
        final_price: financials.finalPrice,
        deposit_amount: financials.deposit_amount,
        paid_amount: financials.paid_amount,
        remaining_amount: financials.remaining_amount,
        payment_status: financials.payment_status,
      })
      .eq("id", orderId);

    if (orderError) {
      return { success: false, error: await formatSupabaseError(orderError) };
    }

    await supabase.from("detailing_order_services").delete().eq("order_id", orderId);

    const existingById = new Map(existing.services.map((service) => [service.id, service]));
    const serviceRows = await buildServiceRowsWithCommissions(
      orderId,
      input.services.map((service) => {
        const prior = service.id ? existingById.get(service.id) : undefined;
        if (!preserveCommissionSnapshot || !prior) return service;
        return {
          ...service,
          assigned_employee_id: prior.assigned_employee_id,
          employee_name_snapshot: prior.employee_name_snapshot,
          commission_percent_snapshot: prior.commission_percent_snapshot,
          commission_amount: prior.commission_amount,
          commission_percent: prior.commission_percent_snapshot ?? undefined,
        };
      }),
      input.status,
      preserveCommissionSnapshot
    );

    const { error: servicesError } = await supabase
      .from("detailing_order_services")
      .insert(serviceRows);

    if (servicesError) {
      return { success: false, error: await formatSupabaseError(servicesError) };
    }

    revalidateDetailingPaths(orderId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateDetailingPaymentStatusAction(
  orderId: string,
  paymentStatus: "paid" | "unpaid"
): Promise<
  ActionResult<{
    payment_status: DetailingPaymentStatus;
    paid_amount: number;
    remaining_amount: number;
    warning?: string;
  }>
> {
  if (paymentStatus !== "paid" && paymentStatus !== "unpaid") {
    const t = await getTranslations("detailing.payment");
    return { success: false, error: t("invalidStatus") };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const t = await getTranslations("detailing.payment");
      return { success: false, error: t("notAuthenticated") };
    }

    const existing = await getDetailingOrderById(orderId);
    if (!existing) {
      const t = await getTranslations("detailing");
      return { success: false, error: t("orderNotFound") };
    }

    if (existing.final_price < 0) {
      const t = await getTranslations("detailing.validation");
      return { success: false, error: t("final_price_negative") };
    }

    const update = resolveQuickPaymentUpdate(existing.final_price, paymentStatus);

    const { error } = await supabase
      .from("detailing_orders")
      .update({
        paid_amount: update.paid_amount,
        remaining_amount: update.remaining_amount,
        payment_status: update.payment_status,
      })
      .eq("id", orderId);

    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidateDetailingPaths(orderId);

    const t = await getTranslations("detailing.payment");
    const warning =
      existing.status === "cancelled" ? t("cancelledOrderWarning") : undefined;

    return {
      success: true,
      data: {
        payment_status: update.payment_status,
        paid_amount: update.paid_amount,
        remaining_amount: update.remaining_amount,
        warning,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function changeDetailingOrderStatusAction(
  orderId: string,
  status: DetailingOrderStatus,
  options?: { confirmNoEmployee?: boolean }
): Promise<ActionResult<{ status: DetailingOrderStatus }>> {
  try {
    const existing = await getDetailingOrderById(orderId);
    if (!existing) {
      const t = await getTranslations("detailing");
      return { success: false, error: t("orderNotFound") };
    }

    if (status === "delivered") {
      const deliverIssues = collectDetailingDeliverValidationIssues({
        final_price: existing.final_price,
        confirm_no_employee: options?.confirmNoEmployee,
      });
      if (deliverIssues.length) {
        return { success: false, error: await translateValidationIssue(deliverIssues[0]) };
      }
    }

    const supabase = await createClient();
    const totalServiceCommission = hasServiceLevelAssignments(existing.services)
      ? sumServiceCommissions(existing.services, status)
      : calculateEmployeeCommission(
          existing.final_price,
          resolveCommissionPercent(existing.employee_commission_percent_snapshot),
          status
        );

    const { error } = await supabase
      .from("detailing_orders")
      .update({
        status,
        actual_completion_at:
          status === "delivered"
            ? existing.actual_completion_at ?? new Date().toISOString()
            : existing.actual_completion_at,
        employee_commission_amount:
          status === "cancelled" ? 0 : totalServiceCommission,
      })
      .eq("id", orderId);

    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidateDetailingPaths(orderId);
    return { success: true, data: { status } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function upsertDetailingEmployeeAction(input: {
  profile_id: string;
  active: boolean;
  commission_percent: number;
  display_name?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("detailing_employee_settings").upsert(
      {
        profile_id: input.profile_id,
        active: input.active,
        commission_percent: input.commission_percent,
        display_name: input.display_name?.trim() || null,
      },
      { onConflict: "profile_id" }
    );

    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidatePath("/detailing/employees");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function createDetailingExpenseAction(input: {
  expense_date: string;
  category: DetailingExpenseCategory;
  description: string;
  amount: number;
  payment_method?: DetailingPaymentMethod | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("detailing_expenses")
      .insert({
        expense_date: input.expense_date,
        category: input.category,
        description: input.description.trim(),
        amount: roundMoney(Math.max(input.amount, 0)),
        payment_method: input.payment_method ?? null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidatePath("/detailing/expenses");
    revalidatePath("/detailing/finance");
    revalidatePath("/detailing");
    return { success: true, data: { id: String(data.id) } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateDetailingExpenseAction(input: {
  id: string;
  expense_date: string;
  category: DetailingExpenseCategory;
  description: string;
  amount: number;
  payment_method?: DetailingPaymentMethod | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("detailing_expenses")
      .update({
        expense_date: input.expense_date,
        category: input.category,
        description: input.description.trim(),
        amount: roundMoney(Math.max(input.amount, 0)),
        payment_method: input.payment_method ?? null,
      })
      .eq("id", input.id);

    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidatePath("/detailing/expenses");
    revalidatePath("/detailing/finance");
    revalidatePath("/detailing");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function saveDetailingServiceAction(
  input: DetailingServiceFormInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const payload = {
      name_cs: input.name_cs.trim(),
      name_ru: input.name_ru.trim(),
      description_cs: input.description_cs?.trim() || null,
      description_ru: input.description_ru?.trim() || null,
      category: input.category,
      base_price: input.base_price ?? null,
      max_price: input.max_price ?? null,
      price_type: input.price_type,
      unit: input.unit?.trim() || null,
      active: input.active,
      sort_order: input.sort_order,
    };

    if (input.id) {
      const { error } = await supabase
        .from("detailing_services")
        .update(payload)
        .eq("id", input.id);
      if (error) {
        return { success: false, error: await formatSupabaseError(error) };
      }
      revalidatePath("/detailing/services");
      return { success: true, data: { id: input.id } };
    }

    const { data, error } = await supabase
      .from("detailing_services")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidatePath("/detailing/services");
    return { success: true, data: { id: String(data.id) } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateDetailingServiceAction(input: {
  id: string;
  active: boolean;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("detailing_services")
      .update({ active: input.active })
      .eq("id", input.id);

    if (error) {
      return { success: false, error: await formatSupabaseError(error) };
    }

    revalidatePath("/detailing/services");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function buildServiceLineFromCatalogue(
  serviceId: string,
  localeName: string,
  quantity = 1
) {
  const service = await getDetailingServiceById(serviceId);
  if (!service) return null;

  const unitPrice =
    service.price_type === "on_request" || service.price_type === "custom"
      ? null
      : service.base_price;

  const totalPrice =
    unitPrice != null ? roundMoney(unitPrice * quantity) : 0;

  return {
    service_id: service.id,
    service_name_snapshot: localeName,
    quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
    price_type: service.price_type,
  };
}
