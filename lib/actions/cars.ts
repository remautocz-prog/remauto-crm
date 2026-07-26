"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  collectCarValidationIssues,
  collectMarkSoldValidationIssues,
  normalizeCarPayload,
  type CarFieldErrors,
  type CarValidationMessageKey,
} from "@/lib/cars/business-rules";
import { createClient } from "@/lib/supabase/server";
import type { Car, CarExpenseInput, CarFormInput } from "@/lib/types/cars";
import { formatSupabaseError, type ActionResult } from "@/lib/utils/errors";

async function mapValidationIssuesToFieldErrors(
  issues: ReturnType<typeof collectCarValidationIssues>
): Promise<CarFieldErrors> {
  const t = await getTranslations("validation");
  const fieldErrors: CarFieldErrors = {};

  for (const issue of issues) {
    fieldErrors[issue.field] = t(issue.messageKey as CarValidationMessageKey);
  }

  return fieldErrors;
}

async function validateCarInput(
  input: CarFormInput,
  options?: { requireSaleFields?: boolean }
): Promise<CarFieldErrors | null> {
  const issues = collectCarValidationIssues(input, options);
  if (issues.length === 0) return null;
  return mapValidationIssuesToFieldErrors(issues);
}

async function validateExpenseInput(input: CarExpenseInput) {
  const t = await getTranslations("validation");

  if (!input.category.trim()) return t("expenseCategoryRequired");
  if (
    input.amount === null ||
    input.amount === undefined ||
    Number.isNaN(input.amount) ||
    input.amount <= 0
  ) {
    return t("expenseAmountRequired");
  }
  if (!input.expense_date?.trim()) return t("expenseDateRequired");
  return null;
}

function validationFailure<T>(fieldErrors: CarFieldErrors): ActionResult<T> {
  const firstError = Object.values(fieldErrors)[0] ?? "Validation failed";
  return { success: false, error: firstError, fieldErrors };
}

export async function createCarAction(
  input: CarFormInput
): Promise<ActionResult<{ id: number }>> {
  const fieldErrors = await validateCarInput(input);
  if (fieldErrors) return validationFailure(fieldErrors);

  const payload = normalizeCarPayload(input);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .insert(payload as Record<string, unknown>)
    .select("id")
    .single();

  if (error) {
    console.error("[createCarAction] Supabase insert failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    });
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/cars");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true, data: { id: data.id } };
}

export async function updateCarAction(
  id: number,
  input: CarFormInput
): Promise<ActionResult> {
  const fieldErrors = await validateCarInput(input);
  if (fieldErrors) return validationFailure(fieldErrors);

  const payload = normalizeCarPayload(input);

  const supabase = await createClient();
  const { error } = await supabase
    .from("cars")
    .update(payload as Record<string, unknown>)
    .eq("id", id);

  if (error) {
    console.error("[updateCarAction] Supabase update failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    });
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/cars");
  revalidatePath(`/cars/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function markCarSoldAction(
  id: number,
  input: Pick<CarFormInput, "actual_sale_price" | "sale_date" | "client_id">
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: car, error: loadError } = await supabase
    .from("cars")
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !car) {
    return {
      success: false,
      error: loadError?.message ?? "Car not found",
    };
  }

  const typedCar = car as Car;
  const issues = collectMarkSoldValidationIssues(typedCar, input);

  if (issues.length > 0) {
    const t = await getTranslations("validation");
    const fieldErrors: CarFieldErrors = {};
    for (const issue of issues) {
      fieldErrors[issue.field] = t(issue.messageKey as CarValidationMessageKey);
    }
    return validationFailure(fieldErrors);
  }

  const { error } = await supabase
    .from("cars")
    .update({
      status: "sold",
      actual_sale_price: input.actual_sale_price,
      sale_date: input.sale_date?.trim() || null,
      client_id: input.client_id ?? typedCar.client_id ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[markCarSoldAction] Supabase update failed:", error);
    return { success: false, error: await formatSupabaseError(error) };
  }

  revalidatePath("/cars");
  revalidatePath(`/cars/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function deleteCarAction(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cars").delete().eq("id", id);

  if (error) return { success: false, error: await formatSupabaseError(error) };

  revalidatePath("/cars");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/cars");
}

export async function createCarExpenseAction(
  carId: number,
  input: CarExpenseInput
): Promise<ActionResult> {
  const validationError = await validateExpenseInput(input);
  if (validationError) return { success: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("car_expenses").insert({
    car_id: carId,
    category: input.category,
    amount: input.amount,
    description: input.description?.trim() || null,
    expense_date: input.expense_date,
  });

  if (error) return { success: false, error: await formatSupabaseError(error) };

  revalidatePath(`/cars/${carId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function updateCarExpenseAction(
  carId: number,
  expenseId: number,
  input: CarExpenseInput
): Promise<ActionResult> {
  const validationError = await validateExpenseInput(input);
  if (validationError) return { success: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("car_expenses")
    .update({
      category: input.category,
      amount: input.amount,
      description: input.description?.trim() || null,
      expense_date: input.expense_date,
    })
    .eq("id", expenseId)
    .eq("car_id", carId);

  if (error) return { success: false, error: await formatSupabaseError(error) };

  revalidatePath(`/cars/${carId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function deleteCarExpenseAction(
  carId: number,
  expenseId: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("car_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("car_id", carId);

  if (error) return { success: false, error: await formatSupabaseError(error) };

  revalidatePath(`/cars/${carId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}
