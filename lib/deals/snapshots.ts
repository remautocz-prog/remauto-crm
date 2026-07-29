import type { CompanySettings } from "@/lib/types/document-templates";
import type { Car } from "@/lib/types/cars";
import type { Client } from "@/lib/types/clients";
import type {
  DealClientSnapshot,
  DealCompanySnapshot,
  DealExternalVehicleInput,
  DealVehicleSnapshot,
} from "@/lib/types/deals";
import { getClientDisplayName } from "@/lib/clients/validation";
import { normalizeVin } from "@/lib/deals/vin";

function empty(value: string | number | null | undefined) {
  if (value == null) return "";
  return String(value).trim();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function buildVehicleSnapshotFromCar(
  car: Car,
  agreedValue: number | null | undefined
): DealVehicleSnapshot {
  return {
    source: "crm",
    car_id: car.id,
    make: empty(car.brand),
    model: empty(car.model),
    full_name: `${car.brand} ${car.model}`.trim(),
    vin: normalizeVin(car.vin),
    registration_plate: empty(car.registration_number),
    first_registration_date: formatDate(car.first_registration_date),
    mileage: car.mileage != null ? String(car.mileage) : "",
    fuel_type: empty(car.fuel_type),
    engine_capacity: empty(car.engine_capacity),
    power_kw: car.power_kw != null ? String(car.power_kw) : "",
    color: empty(car.color),
    technical_certificate_number: empty(car.technical_certificate_number),
    key_count: car.key_count != null ? String(car.key_count) : "",
    agreed_value: agreedValue != null ? String(agreedValue) : "",
  };
}

export function buildVehicleSnapshotFromExternal(
  input: DealExternalVehicleInput
): DealVehicleSnapshot {
  const make = empty(input.make);
  const model = empty(input.model);
  return {
    source: "external",
    car_id: null,
    make,
    model,
    full_name: `${make} ${model}`.trim(),
    vin: normalizeVin(input.vin),
    registration_plate: empty(input.registration_plate),
    first_registration_date: formatDate(input.first_registration_date),
    mileage: input.mileage != null ? String(input.mileage) : "",
    fuel_type: empty(input.fuel_type),
    engine_capacity: empty(input.engine_capacity),
    power_kw: input.power_kw != null ? String(input.power_kw) : "",
    color: empty(input.color),
    technical_certificate_number: empty(input.technical_certificate_number),
    key_count: input.key_count != null ? String(input.key_count) : "",
    agreed_value: input.agreed_value != null ? String(input.agreed_value) : "",
  };
}

export function buildClientSnapshot(client: Client): DealClientSnapshot {
  return {
    client_id: client.id,
    client_type: client.client_type,
    full_name: empty(client.full_name),
    company_name: empty(client.company),
    birth_date: formatDate(client.birth_date),
    personal_id_number: empty(client.personal_id_number),
    identity_document_number: empty(client.identity_document_number),
    tax_id: empty(client.tax_id),
    vat_id: empty(client.vat_id),
    address: empty(client.address),
    city: empty(client.city),
    postal_code: empty(client.postal_code),
    country: empty(client.country),
    phone: empty(client.phone),
    email: empty(client.email),
    bank_account: empty(client.bank_account),
  };
}

export function buildCompanySnapshot(
  company: CompanySettings | null | undefined
): DealCompanySnapshot {
  return {
    name: empty(company?.name),
    ico: empty(company?.ico),
    dic: empty(company?.dic),
    address: empty(company?.address),
    city: empty(company?.city),
    postal_code: empty(company?.postal_code),
    country: empty(company?.country),
    phone: empty(company?.phone),
    email: empty(company?.email),
    bank_account: empty(company?.bank_account),
  };
}

export function getClientLabelFromSnapshot(snapshot: DealClientSnapshot) {
  if (snapshot.client_type === "company" && snapshot.company_name) {
    return snapshot.company_name;
  }
  return snapshot.full_name || snapshot.company_name;
}

export function getVehicleLabelFromSnapshot(snapshot: DealVehicleSnapshot) {
  return snapshot.full_name || `${snapshot.make} ${snapshot.model}`.trim();
}

export function emptyClientSnapshot(): DealClientSnapshot {
  return buildClientSnapshot({
    id: 0,
    full_name: "",
    company: null,
    email: null,
    phone: null,
    address: null,
    notes: null,
    client_type: "individual",
    city: null,
    postal_code: null,
    country: null,
    preferred_language: null,
    tax_id: null,
    vat_id: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    birth_date: null,
    personal_id_number: null,
    identity_document_number: null,
    bank_account: null,
  } as Client);
}

export function emptyVehicleSnapshot(): DealVehicleSnapshot {
  return buildVehicleSnapshotFromExternal({ make: "", model: "" });
}

export function getClientDisplayFromDeal(
  client: Pick<Client, "full_name" | "company" | "client_type"> | null,
  snapshot: DealClientSnapshot
) {
  if (client) return getClientDisplayName(client);
  return getClientLabelFromSnapshot(snapshot) || "—";
}
