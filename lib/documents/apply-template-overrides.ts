import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";
import {
  formatHandoverDocumentsCheckboxes,
  formatPaymentMethodCheckboxes,
  formatPaymentPayerCheckboxes,
  formatRegistrationPayerCheckboxes,
} from "@/lib/documents/vehicle-exchange-formatters";
import type {
  DocumentTemplateData,
  DocumentTemplateOverrides,
} from "@/lib/types/document-templates";
import { isEditedSnapshotUnloadedEmptyForm } from "@/lib/documents/document-generation-validation";

function mergeSection(
  base: Record<string, string>,
  overrides?: Partial<Record<string, string>>
): Record<string, string> {
  const merged = { ...base, ...(overrides ?? {}) };
  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, value ?? ""])
  );
}

function pickHandoverField(
  overrides: DocumentTemplateOverrides["handover"] | undefined,
  overrideKeys: Array<keyof NonNullable<DocumentTemplateOverrides["handover"]>>,
  root: Record<string, unknown>,
  rootKeys: string[]
): string {
  if (overrides) {
    for (const key of overrideKeys) {
      if (key in overrides) return String(overrides[key] ?? "");
    }
  }
  for (const key of rootKeys) {
    if (typeof root[key] === "string") return root[key] as string;
  }
  return "";
}

function mergeHandoverSection(
  base: DocumentTemplateData["handover"],
  overrides?: DocumentTemplateOverrides["handover"]
): DocumentTemplateData["handover"] {
  if (!base && !overrides) return undefined;
  const root = (base ?? {}) as Record<string, unknown>;
  const vehicleA = root.vehicle_a as Record<string, string> | undefined;
  const vehicleB = root.vehicle_b as Record<string, string> | undefined;
  const deliveryDate = pickHandoverField(
    overrides,
    ["delivery_date", "date"],
    root,
    ["delivery_date", "date"]
  );
  const deliveryPlace = pickHandoverField(
    overrides,
    ["delivery_place", "place"],
    root,
    ["delivery_place", "place"]
  );

  return {
    delivery_date: deliveryDate,
    date: deliveryDate,
    delivery_place: deliveryPlace,
    place: deliveryPlace,
    deliverer_name: pickHandoverField(
      overrides,
      ["deliverer_name"],
      root,
      ["deliverer_name"]
    ),
    receiver_name: pickHandoverField(
      overrides,
      ["receiver_name"],
      root,
      ["receiver_name"]
    ),
    notes: pickHandoverField(overrides, ["notes"], root, ["notes"]),
    notes_continued: pickHandoverField(
      overrides,
      ["notes_continued"],
      root,
      ["notes_continued"]
    ),
    vehicle_a: mergeSection(vehicleA ?? {}, overrides?.vehicle_a),
    vehicle_b: mergeSection(vehicleB ?? {}, overrides?.vehicle_b),
  };
}

export function applyTemplateOverrides(
  data: DocumentTemplateData,
  overrides?: DocumentTemplateOverrides
): DocumentTemplateData {
  if (!overrides) return data;

  return {
    ...data,
    company: mergeSection(data.company, overrides.company),
    client: mergeSection(data.client, overrides.client),
    customer: data.customer
      ? mergeSection(data.customer, overrides.customer)
      : data.customer,
    vehicle: mergeSection(data.vehicle, overrides.vehicle),
    order: mergeSection(data.order, overrides.order),
    document: mergeSection(data.document, overrides.document),
    employee: mergeSection(data.employee, overrides.employee),
    deal: data.deal ? mergeSection(data.deal, overrides.deal) : data.deal,
    vehicle_a: data.vehicle_a
      ? mergeSection(data.vehicle_a, overrides.vehicle_a)
      : data.vehicle_a,
    vehicle_b: data.vehicle_b
      ? mergeSection(data.vehicle_b, overrides.vehicle_b)
      : data.vehicle_b,
    payment: data.payment
      ? mergeSection(data.payment, overrides.payment)
      : data.payment,
    registration: data.registration
      ? mergeSection(data.registration, overrides.registration)
      : data.registration,
    service: data.service ? mergeSection(data.service, overrides.service) : data.service,
    handover: mergeHandoverSection(data.handover, overrides.handover),
  };
}

export function emptyDocumentTemplateData(): DocumentTemplateData {
  const emptyVehicleSide = {
    make: "",
    model: "",
    full_name: "",
    make_model: "",
    vin: "",
    registration_plate: "",
    registration_number: "",
    first_registration_date: "",
    mileage: "",
    fuel_type: "",
    fuel: "",
    engine_capacity: "",
    engine_volume: "",
    power_kw: "",
    engine_power: "",
    color: "",
    technical_certificate_number: "",
    technical_document_number: "",
    key_count: "",
    agreed_value: "",
    agreed_value_formatted: "",
    known_defects: "",
    fuel_engine_power: "",
  };

  const emptyHandoverSide = {
    datetime: "",
    mileage: "",
    fuel_level: "",
    key_count: "",
    documents: "",
    documents_checkboxes: formatHandoverDocumentsCheckboxes([]),
    accessories: "",
    visible_damage: "",
  };

  return {
    company: {
      name: "",
      ico: "",
      dic: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      bank_account: "",
      representative: "",
    },
    client: {
      full_name: "",
      company_name: "",
      birth_date: "",
      id_number: "",
      identity_document_number: "",
      address: "",
      phone: "",
      email: "",
      bank_account: "",
    },
    customer: {
      full_name: "",
      address: "",
      bank_account: "",
      birth_date_or_ico: "",
      document_number: "",
      email: "",
      phone: "",
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
    employee: { full_name: "" },
    deal: {
      number: "",
      type: "",
      signing_date: "",
      signing_place: "",
      currency: "",
      vehicle_a_value: "",
      vehicle_b_value: "",
      additional_payment: "",
      additional_payment_words: "",
      additional_payment_payer: "",
      payment_method: "",
      payment_account: "",
      payment_due_date: "",
      payment_status: "",
      vehicle_a_known_defects: "",
      vehicle_b_known_defects: "",
      legal_defects_notes: "",
      service_budget: "",
      service_budget_formatted: "",
      additional_terms: "",
      handover_date: "",
      handover_time: "",
      handover_place: "",
      handover_notes: "",
    },
    vehicle_a: { ...emptyVehicleSide },
    vehicle_b: { ...emptyVehicleSide },
    payment: {
      amount_formatted: "",
      amount_in_words: "",
      ...formatPaymentPayerCheckboxes("none"),
      ...formatPaymentMethodCheckboxes(null),
      bank_account: "",
      due_date: "",
      other_text: "",
      other_method: "",
    },
    registration: {
      ...formatRegistrationPayerCheckboxes(""),
      other_text: "",
    },
    service: {
      approved_budget_formatted: "",
    },
    handover: {
      delivery_date: "",
      date: "",
      delivery_place: "",
      place: "",
      deliverer_name: "",
      receiver_name: "",
      notes: "",
      notes_continued: "",
      vehicle_a: { ...emptyHandoverSide },
      vehicle_b: { ...emptyHandoverSide },
    },
  };
}

const CATEGORY_SECTIONS: Record<DocumentTemplateCategory, string[]> = {
  vehicle_exchange_agreement: [
    "company",
    "customer",
    "client",
    "deal",
    "vehicle_a",
    "vehicle_b",
    "payment",
    "registration",
    "service",
    "handover",
    "document",
    "employee",
  ],
  handover_protocol: [
    "company",
    "client",
    "deal",
    "vehicle_a",
    "vehicle_b",
    "handover",
    "document",
  ],
  purchase_agreement: ["company", "client", "vehicle", "order", "document", "employee"],
  commission_agreement: ["company", "client", "vehicle", "order", "document", "employee"],
  invoice_sheet: ["company", "client", "order", "document"],
  power_of_attorney: [],
  custom: [
    "company",
    "client",
    "vehicle",
    "order",
    "document",
    "employee",
    "deal",
    "vehicle_a",
    "vehicle_b",
    "handover",
  ],
};

export function getGenerationSections(category: DocumentTemplateCategory) {
  return CATEGORY_SECTIONS[category] ?? CATEGORY_SECTIONS.custom;
}

export const DOCUMENT_ONLY_FIELD_PATHS = new Set([
  "document.generated_city",
  "document.signing_date",
  "document.additional_notes",
]);

export function isDocumentOnlyFieldPath(path: string) {
  return DOCUMENT_ONLY_FIELD_PATHS.has(path);
}

function dataHandover(handover: DocumentTemplateData["handover"]) {
  const root = (handover ?? {}) as Record<string, unknown>;
  return {
    delivery_date: typeof root.delivery_date === "string" ? root.delivery_date : "",
    date: typeof root.date === "string" ? root.date : "",
    delivery_place: typeof root.delivery_place === "string" ? root.delivery_place : "",
    place: typeof root.place === "string" ? root.place : "",
    deliverer_name: typeof root.deliverer_name === "string" ? root.deliverer_name : "",
    receiver_name: typeof root.receiver_name === "string" ? root.receiver_name : "",
    notes: typeof root.notes === "string" ? root.notes : "",
    notes_continued: typeof root.notes_continued === "string" ? root.notes_continued : "",
    vehicle_a: (root.vehicle_a as Record<string, string> | undefined) ?? {},
    vehicle_b: (root.vehicle_b as Record<string, string> | undefined) ?? {},
  };
}

function getValueAtPath(data: DocumentTemplateData, path: string): string {
  const parts = path.split(".");
  if (parts[0] === "handover" && parts[1] === "vehicle_a") {
    return dataHandover(data.handover).vehicle_a[parts[2]] ?? "";
  }
  if (parts[0] === "handover" && parts[1] === "vehicle_b") {
    return dataHandover(data.handover).vehicle_b[parts[2]] ?? "";
  }
  if (parts[0] === "handover") {
    const handover = dataHandover(data.handover) as Record<string, string | Record<string, string>>;
    const value = handover[parts[1]];
    return typeof value === "string" ? value : "";
  }

  let current: unknown = data;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return current == null ? "" : String(current);
}

function setOverrideAtPath(
  overrides: DocumentTemplateOverrides,
  path: string,
  value: string
) {
  const parts = path.split(".");
  if (parts[0] === "handover" && parts[1] === "vehicle_a") {
    overrides.handover ??= {};
    overrides.handover.vehicle_a ??= {};
    overrides.handover.vehicle_a[parts[2]] = value;
    return;
  }
  if (parts[0] === "handover" && parts[1] === "vehicle_b") {
    overrides.handover ??= {};
    overrides.handover.vehicle_b ??= {};
    overrides.handover.vehicle_b[parts[2]] = value;
    return;
  }
  if (parts[0] === "handover") {
    overrides.handover ??= {};
    (overrides.handover as Record<string, string>)[parts[1]] = value;
    return;
  }

  const [section, key] = parts as [keyof DocumentTemplateOverrides, string];
  const sectionOverrides = (overrides[section] ?? {}) as Record<string, string>;
  sectionOverrides[key] = value;
  overrides[section] = sectionOverrides;
}

export function buildOverridesFromEditedSnapshot(
  base: DocumentTemplateData,
  edited: DocumentTemplateData
): DocumentTemplateOverrides {
  const overrides: DocumentTemplateOverrides = {};
  for (const path of collectOverridePaths(base, edited)) {
    setOverrideAtPath(overrides, path, getValueAtPath(edited, path));
  }
  return overrides;
}

export function resolveFinalDocumentSnapshot(
  base: DocumentTemplateData,
  edited?: DocumentTemplateData | null,
  options?: { ignoreUnloadedEmptyForm?: boolean }
): DocumentTemplateData {
  if (!edited) return base;
  if (
    options?.ignoreUnloadedEmptyForm !== false &&
    isEditedSnapshotUnloadedEmptyForm(base, edited)
  ) {
    return base;
  }
  const overrides = buildOverridesFromEditedSnapshot(base, edited);
  return applyTemplateOverrides(base, overrides);
}

export function collectOverridePaths(
  base: DocumentTemplateData,
  edited: DocumentTemplateData
): string[] {
  const changed: string[] = [];

  function walk(section: string, baseObj?: Record<string, string>, editedObj?: Record<string, string>) {
    if (!baseObj && !editedObj) return;
    const keys = new Set([
      ...Object.keys(baseObj ?? {}),
      ...Object.keys(editedObj ?? {}),
    ]);
    for (const key of keys) {
      const path = `${section}.${key}`;
      const baseValue = baseObj?.[key] ?? "";
      const editedValue = editedObj?.[key] ?? "";
      if (baseValue !== editedValue) changed.push(path);
    }
  }

  for (const section of [
    "company",
    "client",
    "customer",
    "vehicle",
    "order",
    "document",
    "employee",
    "deal",
    "vehicle_a",
    "vehicle_b",
    "payment",
    "registration",
    "service",
  ] as const) {
    walk(section, base[section], edited[section]);
  }

  const baseHandover = dataHandover(base.handover);
  const editedHandover = dataHandover(edited.handover);
  for (const key of [
    "delivery_date",
    "date",
    "delivery_place",
    "place",
    "deliverer_name",
    "receiver_name",
    "notes",
    "notes_continued",
  ] as const) {
    if (baseHandover[key] !== editedHandover[key]) {
      changed.push(`handover.${key}`);
    }
  }
  walk("handover.vehicle_a", baseHandover.vehicle_a, editedHandover.vehicle_a);
  walk("handover.vehicle_b", baseHandover.vehicle_b, editedHandover.vehicle_b);

  return changed;
}

export function cloneDocumentTemplateData(data: DocumentTemplateData): DocumentTemplateData {
  return JSON.parse(JSON.stringify(data)) as DocumentTemplateData;
}
