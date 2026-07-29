"use server";

import type { DocumentTemplateLanguage } from "@/lib/constants/document-templates";
import {
  buildNotarizedLabels,
  buildPowerOfAttorneyTemplateData,
  buildScopeLabels,
  buildValidityLabels,
  collectPowerOfAttorneyValidationIssues,
  mapCarToVehicle,
  mapClientToParty,
  mapCompanyToParty,
  mapDealVehicleToVehicle,
  mapEmployeeToParty,
  buildPoaDealVehicleOption,
} from "@/lib/documents/power-of-attorney";
import { getCarById, getProfileById } from "@/lib/queries/cars";
import { getClientById } from "@/lib/queries/clients";
import { getCompanySettings } from "@/lib/queries/document-templates";
import { getDealById } from "@/lib/queries/deals";
import { createClient } from "@/lib/supabase/server";
import type { DocumentTemplateData } from "@/lib/types/document-templates";
import type {
  PowerOfAttorneyFormInput,
  PowerOfAttorneyPartyInput,
  PowerOfAttorneyVehicleInput,
} from "@/lib/types/power-of-attorney";
import type { ActionResult } from "@/lib/utils/errors";
import { getTranslations } from "next-intl/server";

export async function buildPowerOfAttorneyPreviewAction(input: {
  language: DocumentTemplateLanguage;
  form: PowerOfAttorneyFormInput;
}): Promise<ActionResult<{ data: DocumentTemplateData }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const t = await getTranslations({
    locale: input.language,
    namespace: "documentGenerator.powerOfAttorney",
  });

  const issues = collectPowerOfAttorneyValidationIssues(input.form);
  if (issues.length > 0) {
    return { success: false, error: t(issues[0].messageKey as never) };
  }

  const data = buildPowerOfAttorneyTemplateData(
    input.form,
    buildScopeLabels((key) => t(key as never)),
    buildValidityLabels((key) => t(key as never)),
    buildNotarizedLabels((key) => t(key as never))
  );

  return { success: true, data: { data } };
}

export async function getPowerOfAttorneyDealVehiclesAction(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const deal = await getDealById(dealId);
  if (!deal) return [];

  return [
    buildPoaDealVehicleOption("a", deal.vehicle_a_snapshot),
    buildPoaDealVehicleOption("b", deal.vehicle_b_snapshot),
  ];
}

export async function loadPowerOfAttorneyAutofillAction(input: {
  source:
    | "remauto_company"
    | "employee"
    | "client"
    | "vehicle"
    | "deal_vehicle_a"
    | "deal_vehicle_b";
  clientId?: number;
  vehicleId?: number;
  dealId?: string;
}): Promise<
  ActionResult<{
    party?: Partial<PowerOfAttorneyPartyInput>;
    vehicle?: Partial<PowerOfAttorneyVehicleInput>;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  switch (input.source) {
    case "remauto_company": {
      const company = await getCompanySettings();
      return { success: true, data: { party: mapCompanyToParty(company) } };
    }
    case "employee": {
      const employee = await getProfileById(user.id);
      return { success: true, data: { party: mapEmployeeToParty(employee) } };
    }
    case "client": {
      if (!input.clientId) {
        return { success: false, error: "Client not selected" };
      }
      const client = await getClientById(input.clientId);
      return { success: true, data: { party: mapClientToParty(client) } };
    }
    case "vehicle": {
      if (!input.vehicleId) {
        return { success: false, error: "Vehicle not selected" };
      }
      const car = await getCarById(input.vehicleId);
      return { success: true, data: { vehicle: mapCarToVehicle(car) } };
    }
    case "deal_vehicle_a":
    case "deal_vehicle_b": {
      if (!input.dealId) {
        return { success: false, error: "Deal not selected" };
      }
      const deal = await getDealById(input.dealId);
      if (!deal) return { success: false, error: "Deal not found" };
      const snapshot =
        input.source === "deal_vehicle_a"
          ? deal.vehicle_a_snapshot
          : deal.vehicle_b_snapshot;
      return { success: true, data: { vehicle: mapDealVehicleToVehicle(snapshot) } };
    }
    default:
      return { success: false, error: "Unknown autofill source" };
  }
}

export async function searchPowerOfAttorneyVehiclesAction(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let dbQuery = supabase
    .from("cars")
    .select("id, brand, model, vin, registration_number")
    .order("created_at", { ascending: false })
    .limit(20);

  if (query.trim()) {
    const term = `%${query.trim()}%`;
    dbQuery = dbQuery.or(
      `vin.ilike.${term},brand.ilike.${term},model.ilike.${term},registration_number.ilike.${term}`
    );
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as number,
    label: `${row.brand} ${row.model} · ${row.registration_number ?? row.vin ?? `#${row.id}`}`,
  }));
}

export async function searchPowerOfAttorneyClientsAction(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let dbQuery = supabase
    .from("clients")
    .select("id, full_name, company, client_type")
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .limit(20);

  if (query.trim()) {
    const term = `%${query.trim()}%`;
    dbQuery = dbQuery.or(
      `full_name.ilike.${term},company.ilike.${term},email.ilike.${term},phone.ilike.${term}`
    );
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as number,
    label:
      row.client_type === "company" && row.company
        ? String(row.company)
        : String(row.full_name),
  }));
}
