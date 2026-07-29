import type { CompanySettings } from "@/lib/types/document-templates";
import type { Car } from "@/lib/types/cars";
import type { Client } from "@/lib/types/clients";
import type { DealVehicleSnapshot } from "@/lib/types/deals";
import type { PoaAuthorizationScope } from "@/lib/constants/power-of-attorney";
import { POA_AUTHORIZATION_SCOPES, POA_DOCUMENT_TYPE } from "@/lib/constants/power-of-attorney";
import type { DocumentTemplateData } from "@/lib/types/document-templates";
import type {
  PowerOfAttorneyFormInput,
  PowerOfAttorneyPartyInput,
  PowerOfAttorneyVehicleInput,
} from "@/lib/types/power-of-attorney";

function empty(value: string | null | undefined) {
  if (value == null) return "";
  return String(value).trim();
}

export function emptyPowerOfAttorneyParty(): PowerOfAttorneyPartyInput {
  return {
    type: "individual",
    full_name: "",
    company_name: "",
    birth_date: "",
    personal_id_number: "",
    identity_document_number: "",
    ico: "",
    dic: "",
    address: "",
    contact_address: "",
    represented_by: "",
    representative_position: "",
    registry_information: "",
    phone: "",
    email: "",
    bank_account: "",
    country: "",
    identification_notes: "",
    position_or_relationship: "",
    authorization_notes: "",
  };
}

export function emptyPowerOfAttorneyVehicle(): PowerOfAttorneyVehicleInput {
  return {
    make: "",
    model: "",
    vin: "",
    registration_plate: "",
    first_registration_date: "",
    technical_certificate_number: "",
    color: "",
    mileage: "",
    fuel_type: "",
    engine_capacity: "",
    power_kw: "",
    registered_owner_name: "",
    registered_owner_address: "",
    registered_owner_identification: "",
    registration_country: "",
  };
}

export function emptyPowerOfAttorneyForm(): PowerOfAttorneyFormInput {
  return {
    principal: emptyPowerOfAttorneyParty(),
    authorized_person: emptyPowerOfAttorneyParty(),
    vehicle: emptyPowerOfAttorneyVehicle(),
    authorization_scopes: [],
    authorization_scope_text: "",
    additional_authorization_text: "",
    signing_place: "",
    signing_date: "",
    valid_from: "",
    valid_until: "",
    validity_type: "one_time",
    notarized_signature: "unknown",
    original_count: "1",
    additional_notes: "",
  };
}

const SCOPE_LABEL_KEYS: Record<PoaAuthorizationScope, string> = {
  registry: "authorizationRegistry",
  owner_change: "authorizationOwnerChange",
  operator_change: "authorizationOperatorChange",
  registration: "authorizationRegistration",
  deregistration: "authorizationDeregistration",
  documents: "authorizationDocuments",
  plates: "authorizationPlates",
  replacement_plates: "authorizationReplacementPlates",
  stk: "authorizationStk",
  emissions: "authorizationEmissions",
  evidential: "authorizationEvidential",
  insurance: "authorizationInsurance",
  customs: "authorizationCustoms",
  import_export: "authorizationImportExport",
  sale: "authorizationSale",
  purchase: "authorizationPurchase",
  handover: "authorizationHandover",
  sign_documents: "authorizationSignDocuments",
  receive_payments: "authorizationReceivePayments",
  other: "authorizationOther",
};

export function getScopeLabelKey(scope: PoaAuthorizationScope) {
  return SCOPE_LABEL_KEYS[scope];
}

export function buildAuthorizationScopeText(
  scopes: PoaAuthorizationScope[],
  labels: Record<string, string>
) {
  const unique = POA_AUTHORIZATION_SCOPES.filter((scope) => scopes.includes(scope));
  return unique
    .map((scope) => labels[SCOPE_LABEL_KEYS[scope]] ?? scope)
    .filter(Boolean)
    .join("; ");
}

function mapParty(party: PowerOfAttorneyPartyInput) {
  return {
    type: empty(party.type),
    full_name: empty(party.full_name),
    company_name: empty(party.company_name),
    birth_date: empty(party.birth_date),
    personal_id_number: empty(party.personal_id_number),
    identity_document_number: empty(party.identity_document_number),
    ico: empty(party.ico),
    dic: empty(party.dic),
    address: empty(party.address),
    contact_address: empty(party.contact_address),
    represented_by: empty(party.represented_by),
    representative_position: empty(party.representative_position),
    registry_information: empty(party.registry_information),
    phone: empty(party.phone),
    email: empty(party.email),
    bank_account: empty(party.bank_account),
    country: empty(party.country),
    identification_notes: empty(party.identification_notes),
    position_or_relationship: empty(party.position_or_relationship),
    authorization_notes: empty(party.authorization_notes),
  };
}

function mapVehicle(vehicle: PowerOfAttorneyVehicleInput) {
  const make = empty(vehicle.make);
  const model = empty(vehicle.model);
  return {
    make,
    model,
    full_name: `${make} ${model}`.trim(),
    vin: empty(vehicle.vin).toUpperCase(),
    registration_plate: empty(vehicle.registration_plate),
    first_registration_date: empty(vehicle.first_registration_date),
    technical_certificate_number: empty(vehicle.technical_certificate_number),
    color: empty(vehicle.color),
    mileage: empty(vehicle.mileage),
    fuel_type: empty(vehicle.fuel_type),
    engine_capacity: empty(vehicle.engine_capacity),
    power_kw: empty(vehicle.power_kw),
    registered_owner_name: empty(vehicle.registered_owner_name),
    registered_owner_address: empty(vehicle.registered_owner_address),
    registered_owner_identification: empty(vehicle.registered_owner_identification),
    registration_country: empty(vehicle.registration_country),
  };
}

export function emptyDocumentTemplateSections(): DocumentTemplateData {
  return {
    company: {
      name: "",
      ico: "",
      dic: "",
      address: "",
      city: "",
      phone: "",
      email: "",
    },
    client: {
      full_name: "",
      company_name: "",
      birth_date: "",
      id_number: "",
      address: "",
      phone: "",
      email: "",
    },
    vehicle: {
      make: "",
      model: "",
      year: "",
      vin: "",
      plate: "",
      mileage: "",
      purchase_price: "",
      sale_price: "",
    },
    order: {
      number: "",
      total_price: "",
      paid_amount: "",
      outstanding_balance: "",
    },
    document: {
      generated_date: "",
      generated_city: "",
      signing_date: "",
      additional_notes: "",
    },
    employee: {
      full_name: "",
    },
  };
}

export function buildPowerOfAttorneyTemplateData(
  input: PowerOfAttorneyFormInput,
  scopeLabels: Record<string, string>,
  validityLabels: Record<string, string>,
  notarizedLabels: Record<string, string>
): DocumentTemplateData {
  const scopeText =
    empty(input.authorization_scope_text) ||
    buildAuthorizationScopeText(input.authorization_scopes, scopeLabels);

  const base = emptyDocumentTemplateSections();

  return {
    ...base,
    document: {
      ...base.document,
      generated_city: empty(input.signing_place),
      signing_date: empty(input.signing_date),
      additional_notes: empty(input.additional_notes),
    },
    power_of_attorney: {
      principal: mapParty(input.principal),
      authorized_person: mapParty(input.authorized_person),
      vehicle: mapVehicle(input.vehicle),
      authorization: {
        scope_text: scopeText,
        additional_text: empty(input.additional_authorization_text),
        selected_scopes: input.authorization_scopes.join(","),
      },
      validity: {
        type: validityLabels[input.validity_type] ?? empty(input.validity_type),
        type_code: empty(input.validity_type),
        valid_from: empty(input.valid_from),
        valid_until: empty(input.valid_until),
        notarized_signature:
          notarizedLabels[input.notarized_signature] ??
          empty(input.notarized_signature),
        notarized_code: empty(input.notarized_signature),
        original_count: empty(input.original_count),
      },
      signing: {
        place: empty(input.signing_place),
        date: empty(input.signing_date),
      },
      additional_notes: empty(input.additional_notes),
    },
    document_type: POA_DOCUMENT_TYPE,
    power_of_attorney_form: input,
  } as DocumentTemplateData;
}

export type PowerOfAttorneyValidationIssue = {
  field: string;
  messageKey: string;
};

function partyIdentified(party: PowerOfAttorneyPartyInput) {
  if (party.type === "company") {
    return Boolean(party.company_name.trim());
  }
  return Boolean(party.full_name.trim());
}

export function collectPowerOfAttorneyValidationIssues(
  input: PowerOfAttorneyFormInput
): PowerOfAttorneyValidationIssue[] {
  const issues: PowerOfAttorneyValidationIssue[] = [];

  if (!partyIdentified(input.principal)) {
    issues.push({ field: "principal", messageKey: "principalRequired" });
  }
  if (!partyIdentified(input.authorized_person)) {
    issues.push({ field: "authorized_person", messageKey: "authorizedPersonRequired" });
  }

  const vin = input.vehicle.vin.trim();
  const hasVehicleId =
    vin.length > 0 ||
    (input.vehicle.make.trim() &&
      input.vehicle.model.trim() &&
      input.vehicle.registration_plate.trim());

  if (!hasVehicleId) {
    issues.push({ field: "vehicle", messageKey: "vehicleIdentificationRequired" });
  }

  if (!input.signing_date.trim()) {
    issues.push({ field: "signing_date", messageKey: "signingDateRequired" });
  }

  const hasScope =
    input.authorization_scopes.length > 0 ||
    input.authorization_scope_text.trim().length > 0 ||
    input.additional_authorization_text.trim().length > 0;

  if (!hasScope) {
    issues.push({ field: "authorization", messageKey: "authorizationScopeRequired" });
  }

  return issues;
}

export function extractPowerOfAttorneyFormFromSnapshot(
  snapshot: Record<string, unknown> | DocumentTemplateData
): PowerOfAttorneyFormInput | null {
  const raw = snapshot as DocumentTemplateData & {
    document_type?: string;
    power_of_attorney?: Record<string, unknown>;
    power_of_attorney_form?: PowerOfAttorneyFormInput;
  };

  if (raw.document_type !== POA_DOCUMENT_TYPE && !raw.power_of_attorney) {
    return null;
  }

  if (raw.power_of_attorney_form) {
    return raw.power_of_attorney_form;
  }

  const stored = raw.power_of_attorney as {
    principal?: Record<string, string>;
    authorized_person?: Record<string, string>;
    vehicle?: Record<string, string>;
    authorization?: Record<string, string>;
    validity?: Record<string, string>;
    signing?: Record<string, string>;
    additional_notes?: string;
  } | undefined;
  if (!stored) return null;

  const form = emptyPowerOfAttorneyForm();

  const principal = stored.principal ?? {};
  const authorized = stored.authorized_person ?? {};
  const vehicle = stored.vehicle ?? {};
  const authorization = stored.authorization ?? {};
  const validity = stored.validity ?? {};
  const signing = stored.signing ?? {};

  form.principal = {
    ...form.principal,
    type: (principal.type as "individual" | "company") || "individual",
    full_name: principal.full_name ?? "",
    company_name: principal.company_name ?? "",
    birth_date: principal.birth_date ?? "",
    personal_id_number: principal.personal_id_number ?? "",
    identity_document_number: principal.identity_document_number ?? "",
    ico: principal.ico ?? "",
    dic: principal.dic ?? "",
    address: principal.address ?? "",
    contact_address: principal.contact_address ?? "",
    represented_by: principal.represented_by ?? "",
    representative_position: principal.representative_position ?? "",
    registry_information: principal.registry_information ?? "",
    phone: principal.phone ?? "",
    email: principal.email ?? "",
    bank_account: principal.bank_account ?? "",
    country: principal.country ?? "",
    identification_notes: principal.identification_notes ?? "",
  };

  form.authorized_person = {
    ...form.authorized_person,
    type: (authorized.type as "individual" | "company") || "individual",
    full_name: authorized.full_name ?? "",
    company_name: authorized.company_name ?? "",
    birth_date: authorized.birth_date ?? "",
    personal_id_number: authorized.personal_id_number ?? "",
    identity_document_number: authorized.identity_document_number ?? "",
    ico: authorized.ico ?? "",
    dic: authorized.dic ?? "",
    address: authorized.address ?? "",
    represented_by: authorized.represented_by ?? "",
    representative_position: authorized.representative_position ?? "",
    phone: authorized.phone ?? "",
    email: authorized.email ?? "",
    position_or_relationship: authorized.position_or_relationship ?? "",
    authorization_notes: authorized.authorization_notes ?? "",
  };

  form.vehicle = {
    ...form.vehicle,
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    vin: vehicle.vin ?? "",
    registration_plate: vehicle.registration_plate ?? "",
    first_registration_date: vehicle.first_registration_date ?? "",
    technical_certificate_number: vehicle.technical_certificate_number ?? "",
    color: vehicle.color ?? "",
    mileage: vehicle.mileage ?? "",
    fuel_type: vehicle.fuel_type ?? "",
    engine_capacity: vehicle.engine_capacity ?? "",
    power_kw: vehicle.power_kw ?? "",
    registered_owner_name: vehicle.registered_owner_name ?? "",
    registered_owner_address: vehicle.registered_owner_address ?? "",
    registered_owner_identification: vehicle.registered_owner_identification ?? "",
    registration_country: vehicle.registration_country ?? "",
  };

  form.authorization_scope_text = authorization.scope_text ?? "";
  form.additional_authorization_text = authorization.additional_text ?? "";
  if (authorization.selected_scopes) {
    form.authorization_scopes = authorization.selected_scopes
      .split(",")
      .filter(Boolean) as PoaAuthorizationScope[];
  }
  form.signing_place = signing.place ?? "";
  form.signing_date = signing.date ?? "";
  form.valid_from = validity.valid_from ?? "";
  form.valid_until = validity.valid_until ?? "";
  form.original_count = validity.original_count ?? "1";
  form.additional_notes = stored.additional_notes ?? "";
  if (validity.type_code) {
    form.validity_type = validity.type_code as PowerOfAttorneyFormInput["validity_type"];
  }
  if (validity.notarized_code) {
    form.notarized_signature =
      validity.notarized_code as PowerOfAttorneyFormInput["notarized_signature"];
  }

  return form;
}

export function getPowerOfAttorneyListSummary(snapshot: Record<string, unknown>) {
  const poa = snapshot.power_of_attorney as Record<string, Record<string, string>> | undefined;
  if (!poa) {
    return { principal: "", authorizedPerson: "", vehicle: "" };
  }

  const principal = poa.principal ?? {};
  const authorized = poa.authorized_person ?? {};
  const vehicle = poa.vehicle ?? {};

  const principalLabel =
    principal.type === "company"
      ? empty(principal.company_name)
      : empty(principal.full_name);
  const authorizedLabel =
    authorized.type === "company"
      ? empty(authorized.company_name)
      : empty(authorized.full_name);
  const vehicleLabel =
    empty(vehicle.full_name) ||
    `${empty(vehicle.make)} ${empty(vehicle.model)}`.trim();

  return {
    principal: principalLabel,
    authorizedPerson: authorizedLabel,
    vehicle: vehicleLabel,
  };
}

export function buildScopeLabels(
  t: (key: string) => string
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const scope of POA_AUTHORIZATION_SCOPES) {
    labels[SCOPE_LABEL_KEYS[scope]] = t(SCOPE_LABEL_KEYS[scope]);
  }
  return labels;
}

export function buildValidityLabels(t: (key: string) => string) {
  return {
    one_time: t("oneTime"),
    until_date: t("untilDate"),
    indefinite: t("indefinite"),
    until_revoked: t("untilRevoked"),
  };
}

export function buildNotarizedLabels(t: (key: string) => string) {
  return {
    yes: t("notarizedYes"),
    no: t("notarizedNo"),
    unknown: t("notarizedUnknown"),
  };
}

export function partyDisplayName(party: PowerOfAttorneyPartyInput) {
  if (party.type === "company") {
    return party.company_name.trim() || party.full_name.trim();
  }
  return party.full_name.trim() || party.company_name.trim();
}

export function isPowerOfAttorneySnapshot(snapshot: Record<string, unknown>) {
  return (
    snapshot.document_type === POA_DOCUMENT_TYPE ||
    Boolean(snapshot.power_of_attorney)
  );
}

export type PoaAutofillSource =
  | "remauto_company"
  | "employee"
  | "client"
  | "vehicle"
  | "deal_vehicle_a"
  | "deal_vehicle_b";

function formatClientAddress(client: Client) {
  const parts = [client.address, client.city, client.postal_code, client.country].filter(
    Boolean
  );
  return parts.join(", ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function mapCompanyToParty(
  company: CompanySettings | null | undefined
): Partial<PowerOfAttorneyPartyInput> {
  const address = [company?.address, company?.city, company?.postal_code, company?.country]
    .filter(Boolean)
    .join(", ");
  return {
    type: "company",
    company_name: empty(company?.name),
    ico: empty(company?.ico),
    dic: empty(company?.dic),
    address,
    phone: empty(company?.phone),
    email: empty(company?.email),
    bank_account: empty(company?.bank_account),
    country: empty(company?.country),
  };
}

export function mapEmployeeToParty(
  employee: { full_name: string | null } | null | undefined
): Partial<PowerOfAttorneyPartyInput> {
  return {
    type: "individual",
    full_name: empty(employee?.full_name),
  };
}

export function mapClientToParty(client: Client | null | undefined): Partial<PowerOfAttorneyPartyInput> {
  if (!client) return {};
  const isCompany = client.client_type === "company";
  return {
    type: isCompany ? "company" : "individual",
    full_name: empty(client.full_name),
    company_name: empty(client.company),
    birth_date: formatDate(client.birth_date),
    personal_id_number: empty(client.personal_id_number),
    identity_document_number: empty(client.identity_document_number),
    ico: empty(client.tax_id),
    dic: empty(client.vat_id),
    address: formatClientAddress(client),
    phone: empty(client.phone),
    email: empty(client.email),
    bank_account: empty(client.bank_account),
    country: empty(client.country),
  };
}

export function mapCarToVehicle(car: Car | null | undefined): Partial<PowerOfAttorneyVehicleInput> {
  if (!car) return {};
  return {
    make: empty(car.brand),
    model: empty(car.model),
    vin: empty(car.vin).toUpperCase(),
    registration_plate: empty(car.registration_number),
    first_registration_date: formatDate(car.first_registration_date),
    technical_certificate_number: empty(car.technical_certificate_number),
    color: empty(car.color),
    mileage: car.mileage != null ? String(car.mileage) : "",
    fuel_type: empty(car.fuel_type),
    engine_capacity: empty(car.engine_capacity),
    power_kw: car.power_kw != null ? String(car.power_kw) : "",
  };
}

export function mapDealVehicleToVehicle(
  snapshot: DealVehicleSnapshot | null | undefined
): Partial<PowerOfAttorneyVehicleInput> {
  if (!snapshot) return {};
  return {
    make: empty(snapshot.make),
    model: empty(snapshot.model),
    vin: empty(snapshot.vin).toUpperCase(),
    registration_plate: empty(snapshot.registration_plate),
    first_registration_date: empty(snapshot.first_registration_date),
    technical_certificate_number: empty(snapshot.technical_certificate_number),
    color: empty(snapshot.color),
    mileage: empty(snapshot.mileage),
    fuel_type: empty(snapshot.fuel_type),
    engine_capacity: empty(snapshot.engine_capacity),
    power_kw: empty(snapshot.power_kw),
  };
}

export type PoaDealVehicleSide = "a" | "b";

export type PoaDealVehicleOption = {
  side: PoaDealVehicleSide;
  source: DealVehicleSnapshot["source"];
  make: string;
  model: string;
  vin: string;
  registration_plate: string;
  available: boolean;
};

export function isDealVehicleSnapshotPopulated(
  snapshot: DealVehicleSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  const vin = empty(snapshot.vin);
  const plate = empty(snapshot.registration_plate);
  const make = empty(snapshot.make);
  const model = empty(snapshot.model);
  return Boolean(vin || plate || (make && model));
}

export function buildPoaDealVehicleOption(
  side: PoaDealVehicleSide,
  snapshot: DealVehicleSnapshot
): PoaDealVehicleOption {
  return {
    side,
    source: snapshot.source,
    make: empty(snapshot.make),
    model: empty(snapshot.model),
    vin: empty(snapshot.vin).toUpperCase(),
    registration_plate: empty(snapshot.registration_plate),
    available: isDealVehicleSnapshotPopulated(snapshot),
  };
}

export function mergePartyFields(
  current: PowerOfAttorneyPartyInput,
  patch: Partial<PowerOfAttorneyPartyInput>
): PowerOfAttorneyPartyInput {
  return { ...current, ...patch };
}

export function mergeVehicleFields(
  current: PowerOfAttorneyVehicleInput,
  patch: Partial<PowerOfAttorneyVehicleInput>
): PowerOfAttorneyVehicleInput {
  return { ...current, ...patch };
}
