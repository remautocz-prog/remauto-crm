import { getCurrentUserAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import {
  type DetailingCarSelectorOption,
  isDetailingCarSelectorStatus,
  sortDetailingCarSelectorOptions,
} from "@/lib/detailing/car-selector";
import {
  DetailingQueryError,
  logDetailingQueryError,
  type SupabaseQueryError,
} from "@/lib/detailing/query-utils";
import { createClient } from "@/lib/supabase/server";

const SELECT_FIELDS =
  "id, brand, model, year, vin, registration_number, status, mileage, stock_number";

const RPC_NAME = "list_detailing_car_selector_cars";

function mapCarRow(row: Record<string, unknown>): DetailingCarSelectorOption {
  return {
    id: Number(row.id),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    year: Number(row.year),
    vin: (row.vin as string | null) ?? null,
    registration_number: (row.registration_number as string | null) ?? null,
    status: String(row.status ?? ""),
    mileage: row.mileage == null ? null : Number(row.mileage),
    stock_number: (row.stock_number as string | null) ?? null,
  };
}

function filterSelectorCars(cars: DetailingCarSelectorOption[]): DetailingCarSelectorOption[] {
  return sortDetailingCarSelectorOptions(
    cars.filter((car) => isDetailingCarSelectorStatus(car.status))
  );
}

function logDetailingCarSelectorRpcResult(
  error: SupabaseQueryError | null,
  rowCount: number | null
): void {
  if (error) {
    console.error("[detailing-car-selector-rpc]", {
      rpc: RPC_NAME,
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return;
  }

  console.info("[detailing-car-selector-rpc]", {
    rpc: RPC_NAME,
    rowCount,
  });
}

function isRpcMissingFunctionError(error: SupabaseQueryError): boolean {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "42883") return true;
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("function") && message.includes("does not exist")) return true;

  return false;
}

function toDetailingQueryError(error: SupabaseQueryError): DetailingQueryError {
  return new DetailingQueryError(RPC_NAME, error);
}

async function loadCarsViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DetailingCarSelectorOption[] | null> {
  const { data, error } = await supabase.rpc(RPC_NAME, {});

  logDetailingCarSelectorRpcResult(error, Array.isArray(data) ? data.length : null);

  if (error) {
    if (isRpcMissingFunctionError(error)) {
      return null;
    }
    throw toDetailingQueryError(error);
  }

  if (!Array.isArray(data)) {
    console.error("[detailing-car-selector-rpc] unexpected payload type", {
      rpc: RPC_NAME,
      payloadType: data === null ? "null" : typeof data,
    });
    return [];
  }

  return filterSelectorCars(
    data.map((row) => mapCarRow(row as Record<string, unknown>))
  );
}

async function loadCarsViaTable(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DetailingCarSelectorOption[]> {
  const { data, error } = await supabase
    .from("cars")
    .select(SELECT_FIELDS)
    .in("status", [
      "in_stock",
      "reserved",
      "in_transit",
      "in_progress",
      "new",
      "sold",
    ])
    .order("created_at", { ascending: false });

  if (error) {
    logDetailingQueryError("getDetailingCarSelectorOptions.table", error);
    throw new DetailingQueryError("getDetailingCarSelectorOptions.table", error);
  }
  return filterSelectorCars((data ?? []).map((row) => mapCarRow(row)));
}

async function loadLinkedCar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  carId: number
): Promise<DetailingCarSelectorOption | null> {
  const { data, error } = await supabase
    .from("cars")
    .select(SELECT_FIELDS)
    .eq("id", carId)
    .maybeSingle();

  if (error) throw new DetailingQueryError("getDetailingCarSelectorOptions.linked", error);
  if (!data) return null;
  return mapCarRow(data as Record<string, unknown>);
}

/**
 * Loads minimal CRM car options for the detailing internal-vehicle selector.
 * Uses a narrow security-definer RPC when available (detailing employees),
 * otherwise falls back to a direct cars query (owner/admin and other car readers).
 */
export async function getDetailingCarSelectorOptions(input?: {
  linkedCarId?: number | null;
}): Promise<DetailingCarSelectorOption[]> {
  const access = await getCurrentUserAccess();
  const role = access?.role ?? "inactive";

  if (
    !hasPermission(role, "detailing.create") &&
    !hasPermission(role, "detailing.update") &&
    !hasPermission(role, "cars.view")
  ) {
    return [];
  }

  const supabase = await createClient();
  const linkedCarId = input?.linkedCarId ?? null;

  let cars: DetailingCarSelectorOption[];

  const rpcCars = await loadCarsViaRpc(supabase);
  if (rpcCars != null) {
    cars = rpcCars;
  } else {
    cars = await loadCarsViaTable(supabase);
  }

  if (linkedCarId != null && !cars.some((car) => car.id === linkedCarId)) {
    try {
      const linked = await loadLinkedCar(supabase, linkedCarId);
      if (linked) {
        cars = sortDetailingCarSelectorOptions([linked, ...cars]);
      }
    } catch {
      // Linked car may be inaccessible; keep the default list.
    }
  }

  return cars;
}
