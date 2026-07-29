import {
  classifyPlaceholders,
  KNOWN_PLACEHOLDER_CODES,
} from "@/lib/documents/template-placeholders";
import {
  PLACEHOLDER_ALIASES,
  resolvePlaceholderCode,
} from "@/lib/documents/placeholder-aliases";
import {
  CHECKBOX_CHECKED,
  CHECKBOX_UNCHECKED,
  formatCheckbox,
  formatCzechDate,
  formatCzechDateTime,
  formatDealCurrencyAmount,
  formatFuelEnginePower,
  formatHandoverDocumentsCheckboxes,
  formatPaymentMethodCheckboxes,
  formatPaymentPayerCheckboxes,
  formatRegistrationPayerCheckboxes,
  resolveHandoverDate,
} from "@/lib/documents/vehicle-exchange-formatters";
import { applyTemplateOverrides } from "@/lib/documents/apply-template-overrides";
import { applyLegacyPlaceholderAliases } from "@/lib/documents/placeholder-aliases";
import { buildDealDocumentTemplateData } from "@/lib/deals/template-data";
import type { DealWithRelations } from "@/lib/types/deals";

const VEHICLE_EXCHANGE_PLACEHOLDERS = [
  "{{company.address}}",
  "{{company.bank_account}}",
  "{{company.email}}",
  "{{company.ico}}",
  "{{company.phone}}",
  "{{company.representative}}",
  "{{customer.address}}",
  "{{customer.bank_account}}",
  "{{customer.birth_date_or_ico}}",
  "{{customer.document_number}}",
  "{{customer.email}}",
  "{{customer.full_name}}",
  "{{customer.phone}}",
  "{{deal.number}}",
  "{{deal.signing_date}}",
  "{{deal.signing_place}}",
  "{{deal.legal_defects_notes}}",
  "{{vehicle_a.make_model}}",
  "{{vehicle_a.vin}}",
  "{{vehicle_a.registration_number}}",
  "{{vehicle_a.first_registration_date}}",
  "{{vehicle_a.mileage}}",
  "{{vehicle_a.fuel}}",
  "{{vehicle_a.engine_volume}}",
  "{{vehicle_a.engine_power}}",
  "{{vehicle_a.color}}",
  "{{vehicle_a.technical_document_number}}",
  "{{vehicle_a.key_count}}",
  "{{vehicle_a.agreed_value_formatted}}",
  "{{vehicle_a.known_defects}}",
  "{{vehicle_b.make_model}}",
  "{{vehicle_b.vin}}",
  "{{vehicle_b.registration_number}}",
  "{{vehicle_b.first_registration_date}}",
  "{{vehicle_b.mileage}}",
  "{{vehicle_b.fuel}}",
  "{{vehicle_b.engine_volume}}",
  "{{vehicle_b.engine_power}}",
  "{{vehicle_b.color}}",
  "{{vehicle_b.technical_document_number}}",
  "{{vehicle_b.key_count}}",
  "{{vehicle_b.agreed_value_formatted}}",
  "{{vehicle_b.known_defects}}",
  "{{payment.amount_formatted}}",
  "{{payment.amount_in_words}}",
  "{{payment.payer_customer_checkbox}}",
  "{{payment.payer_remauto_checkbox}}",
  "{{payment.cash_checkbox}}",
  "{{payment.bank_transfer_checkbox}}",
  "{{payment.other_checkbox}}",
  "{{payment.bank_account}}",
  "{{payment.due_date}}",
  "{{payment.other_text}}",
  "{{registration.each_party_checkbox}}",
  "{{registration.remauto_checkbox}}",
  "{{registration.customer_checkbox}}",
  "{{registration.other_checkbox}}",
  "{{registration.other_text}}",
  "{{handover.delivery_date}}",
  "{{handover.delivery_place}}",
  "{{handover.notes}}",
  "{{handover.vehicle_a.datetime}}",
  "{{handover.vehicle_a.mileage}}",
  "{{handover.vehicle_a.fuel_level}}",
  "{{handover.vehicle_a.key_count}}",
  "{{handover.vehicle_a.documents_checkboxes}}",
  "{{handover.vehicle_a.accessories}}",
  "{{handover.vehicle_a.visible_damage}}",
  "{{handover.vehicle_b.datetime}}",
  "{{handover.vehicle_b.mileage}}",
  "{{handover.vehicle_b.fuel_level}}",
  "{{handover.vehicle_b.key_count}}",
  "{{handover.vehicle_b.documents_checkboxes}}",
  "{{handover.vehicle_b.accessories}}",
  "{{handover.vehicle_b.visible_damage}}",
  "{{service.approved_budget_formatted}}",
] as const;

const FINAL_UNKNOWN_PLACEHOLDERS = [
  "{{dealService_budget_formatted}}",
  "{{handover.date}}",
  "{{handover.deliverer_name}}",
  "{{handover.notes_continued}}",
  "{{handover.place}}",
  "{{handover.receiver_name}}",
  "{{payment.other_method}}",
  "{{vehicle_a.fuel_engine_power}}",
  "{{vehicle_b.fuel_engine_power}}",
] as const;

const LEGACY_ALIASES = [
  "{{dealNumber}}",
  "{{companyIco}}",
  "{{companyAddress}}",
  "{{customerFull_name}}",
  "{{dealService_budget_formatted}}",
  "{{deal.service_budget_formatted}}",
  "{{payment.other_method}}",
  "{{handover.date}}",
  "{{handover.place}}",
] as const;

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function testPlaceholderRecognition() {
  const { unknown } = classifyPlaceholders([...VEHICLE_EXCHANGE_PLACEHOLDERS]);
  assert(
    unknown.length === 0,
    `Expected 0 unknown placeholders, got ${unknown.length}: ${unknown.join(", ")}`
  );

  for (const code of VEHICLE_EXCHANGE_PLACEHOLDERS) {
    assert(
      KNOWN_PLACEHOLDER_CODES.has(code),
      `Missing canonical placeholder registration for ${code}`
    );
  }
}

function testAliases() {
  for (const [legacy, canonicalPath] of Object.entries(PLACEHOLDER_ALIASES)) {
    assert(
      resolvePlaceholderCode(`{{${legacy}}}`) === `{{${canonicalPath}}}`,
      `Alias resolution failed for ${legacy}`
    );
    assert(
      KNOWN_PLACEHOLDER_CODES.has(`{{${canonicalPath}}}`),
      `Canonical placeholder missing for alias ${legacy} -> ${canonicalPath}`
    );
  }

  const { unknown } = classifyPlaceholders([...LEGACY_ALIASES]);
  assert(unknown.length === 0, `Legacy aliases should be recognized: ${unknown.join(", ")}`);
}

function testCheckboxOutputs() {
  assert(formatCheckbox(true) === CHECKBOX_CHECKED, "Checked checkbox mismatch");
  assert(formatCheckbox(false) === CHECKBOX_UNCHECKED, "Unchecked checkbox mismatch");

  const customerPayer = formatPaymentPayerCheckboxes("customer");
  assert(customerPayer.payer_customer_checkbox === CHECKBOX_CHECKED);
  assert(customerPayer.payer_remauto_checkbox === CHECKBOX_UNCHECKED);

  const remautoPayer = formatPaymentPayerCheckboxes("remauto");
  assert(remautoPayer.payer_remauto_checkbox === CHECKBOX_CHECKED);
  assert(remautoPayer.payer_customer_checkbox === CHECKBOX_UNCHECKED);

  const cashMethod = formatPaymentMethodCheckboxes("cash");
  assert(cashMethod.cash_checkbox === CHECKBOX_CHECKED);
  assert(cashMethod.bank_transfer_checkbox === CHECKBOX_UNCHECKED);
  assert(cashMethod.other_checkbox === CHECKBOX_UNCHECKED);

  const registration = formatRegistrationPayerCheckboxes("each_party");
  assert(registration.each_party_checkbox === CHECKBOX_CHECKED);
  assert(registration.remauto_checkbox === CHECKBOX_UNCHECKED);
  assert(registration.customer_checkbox === CHECKBOX_UNCHECKED);
  assert(registration.other_checkbox === CHECKBOX_UNCHECKED);
}

function testFormatting() {
  assert(formatCzechDate("2026-07-26") === "26.07.2026");
  assert(formatCzechDateTime("2026-07-26T14:05:00.000Z").startsWith("26.07.2026"));
  assert(formatDealCurrencyAmount(245000, "CZK", "cs").replace(/\u00a0/g, " ") === "245 000 Kč");
  assert(formatDealCurrencyAmount(9800, "EUR", "cs").replace(/\u00a0/g, " ") === "9 800 EUR");
}

function testHandoverDocumentsCheckboxes() {
  const selected = formatHandoverDocumentsCheckboxes(["orv", "service_book"]);
  assert(selected.includes("☑ ORV"));
  assert(selected.includes("☐ TP / COC"));
  assert(selected.includes("☑ Servisní kniha"));
  assert(selected.includes("☐ Jiné"));

  const otherWithText = formatHandoverDocumentsCheckboxes(["other"], "Výměnný list");
  assert(otherWithText.includes("☑ Jiné Výměnný list"));
}

const SERVICE_BUDGET_PLACEHOLDERS = [
  "{{deal.service_budget_formatted}}",
  "{{dealService_budget_formatted}}",
  "{{service.approved_budget_formatted}}",
] as const;

function testServiceBudgetPlaceholders() {
  const { unknown } = classifyPlaceholders([...SERVICE_BUDGET_PLACEHOLDERS]);
  assert(
    unknown.length === 0,
    `Expected 0 unknown service budget placeholders, got ${unknown.length}: ${unknown.join(", ")}`
  );

  assert(
    resolvePlaceholderCode("{{deal.service_budget_formatted}}") ===
      "{{service.approved_budget_formatted}}"
  );
  assert(
    resolvePlaceholderCode("{{dealService_budget_formatted}}") ===
      "{{service.approved_budget_formatted}}"
  );

  const deal = createMockDeal();
  deal.service_budget = null;
  const emptyData = buildDealDocumentTemplateData(deal, "cs");
  assert(emptyData.service?.approved_budget_formatted === "");
  assert(emptyData.deal?.service_budget_formatted === "");

  deal.service_budget = 15000;
  const data = buildDealDocumentTemplateData(deal, "cs");
  const formatted = String(data.service?.approved_budget_formatted).replace(/\u00a0/g, " ");
  assert(formatted === "15 000 Kč");
  assert(data.deal?.service_budget_formatted === data.service?.approved_budget_formatted);

  const aliased = applyLegacyPlaceholderAliases(data) as Record<string, unknown>;
  assert(String(aliased.dealService_budget_formatted).replace(/\u00a0/g, " ") === "15 000 Kč");
  const dealRoot = aliased.deal as Record<string, string>;
  assert(dealRoot.service_budget_formatted.replace(/\u00a0/g, " ") === "15 000 Kč");
}

function testFinalPlaceholderRecognition() {
  const { unknown } = classifyPlaceholders([...FINAL_UNKNOWN_PLACEHOLDERS]);
  assert(
    unknown.length === 0,
    `Expected 0 unknown final placeholders, got ${unknown.length}: ${unknown.join(", ")}`
  );
}

function testFuelEnginePowerFormatting() {
  const full = formatFuelEnginePower({
    fuel: "diesel",
    engineVolume: "2993",
    enginePower: "210",
    locale: "cs",
  }).replace(/\u00a0/g, " ");
  assert(full === "Diesel / 2 993 cm³ / 210 kW");

  const petrol = formatFuelEnginePower({
    fuel: "petrol",
    engineVolume: "1998",
    enginePower: "140",
    locale: "cs",
  }).replace(/\u00a0/g, " ");
  assert(petrol === "Benzín / 1 998 cm³ / 140 kW");

  assert(
    formatFuelEnginePower({
      fuel: "diesel",
      engineVolume: "",
      enginePower: "140",
      locale: "cs",
    }) === "Diesel / 140 kW"
  );
  assert(
    formatFuelEnginePower({
      fuel: "",
      engineVolume: "1998",
      enginePower: "",
      locale: "cs",
    }).replace(/\u00a0/g, " ") === "1 998 cm³"
  );
  assert(
    formatFuelEnginePower({
      fuel: "",
      engineVolume: "",
      enginePower: "",
      locale: "cs",
    }) === ""
  );
}

function testHandoverFallbacks() {
  const deal = createMockDeal();
  const data = buildDealDocumentTemplateData(deal, "cs");
  const handover = data.handover as Record<string, string>;

  assert(handover.date === "15.08.2026");
  assert(handover.delivery_date === "15.08.2026");
  assert(handover.place === "Praha");
  assert(handover.receiver_name === "Jan Novák");
  assert(handover.deliverer_name === "");
  assert(handover.notes_continued === "");
  assert(handover.notes === "");

  const noGeneralDate = createMockDeal();
  noGeneralDate.handover_date = null;
  const fallbackData = buildDealDocumentTemplateData(noGeneralDate, "cs");
  const fallbackHandover = fallbackData.handover as Record<string, string>;
  assert(fallbackHandover.date === "15.08.2026");

  assert(
    resolveHandoverDate({
      handoverDate: null,
      vehicleADatetime: null,
      vehicleBDatetime: "2026-09-01T12:00:00.000Z",
    }) === "01.09.2026"
  );
}

function testAliasDataAndOverrides() {
  const deal = createMockDeal();
  deal.payment_method = "other";
  deal.custom_payment_method = "Hotově u notáře";
  deal.service_budget = 15000;

  const data = buildDealDocumentTemplateData(deal, "cs");
  const aliased = applyLegacyPlaceholderAliases(data) as Record<string, unknown>;

  assert(
    String(aliased.dealService_budget_formatted).replace(/\u00a0/g, " ").includes("15 000 Kč")
  );
  assert(data.payment?.other_text === "Hotově u notáře");
  assert(data.payment?.other_method === "Hotově u notáře");

  const paymentRoot = aliased.payment as Record<string, string>;
  assert(paymentRoot.other_method === "Hotově u notáře");

  const overridden = applyTemplateOverrides(data, {
    handover: {
      date: "20.08.2026",
      deliverer_name: "Petr Svoboda",
      receiver_name: "Marie Nováková",
      notes_continued: "Doplňující poznámky",
    },
  });
  const handover = overridden.handover as Record<string, string>;
  assert(handover.date === "20.08.2026");
  assert(handover.delivery_date === "20.08.2026");
  assert(handover.deliverer_name === "Petr Svoboda");
  assert(handover.receiver_name === "Marie Nováková");
  assert(handover.notes_continued === "Doplňující poznámky");
  assert(handover.notes === "");
}

function testDerivedVehicleFields() {
  const deal = createMockDeal();
  deal.vehicle_b_snapshot.fuel_type = "petrol";
  const data = buildDealDocumentTemplateData(deal, "cs");

  assert(data.vehicle_a?.fuel_engine_power?.replace(/\u00a0/g, " ") === "Diesel / 2 993 cm³ / 195 kW");
  assert(data.vehicle_b?.fuel_engine_power?.replace(/\u00a0/g, " ") === "Benzín / 1 984 cm³ / 140 kW");
}

function testEmptyFallbacks() {
  const deal = createMockDeal();
  const data = buildDealDocumentTemplateData(deal, "cs");

  assert(data.company.representative === "");
  assert(data.customer?.full_name === "Jan Novák");
  assert(data.payment?.payer_customer_checkbox === CHECKBOX_CHECKED);
  assert(data.payment?.bank_transfer_checkbox === CHECKBOX_CHECKED);
  assert(data.registration?.other_text === "");
  assert(data.vehicle_a?.known_defects === "");
  assert(data.handover?.vehicle_a && typeof data.handover.vehicle_a === "object");
  const vehicleAHandover = data.handover?.vehicle_a as Record<string, string>;
  assert(vehicleAHandover.documents_checkboxes.includes("☐"));
}

function createMockDeal(): DealWithRelations {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    deal_number: "SM-2026-0001",
    deal_type: "vehicle_exchange_with_additional_payment",
    status: "prepared",
    client_id: 1,
    vehicle_a_id: 1,
    vehicle_b_id: 2,
    vehicle_a_source: "crm",
    vehicle_b_source: "crm",
    vehicle_a_snapshot: {
      source: "crm",
      car_id: 1,
      make: "BMW",
      model: "530d",
      full_name: "BMW 530d",
      vin: "WBA12345678900000",
      registration_plate: "1AB2345",
      first_registration_date: "2019-03-15",
      mileage: "85000",
      fuel_type: "diesel",
      engine_capacity: "2993",
      power_kw: "195",
      color: "černá",
      technical_certificate_number: "UT123456",
      key_count: "2",
      agreed_value: "520000",
    },
    vehicle_b_snapshot: {
      source: "crm",
      car_id: 2,
      make: "Audi",
      model: "A4",
      full_name: "Audi A4",
      vin: "WAUZZZ8K9KA123456",
      registration_plate: "2CD3456",
      first_registration_date: "2018-06-01",
      mileage: "120000",
      fuel_type: "petrol",
      engine_capacity: "1984",
      power_kw: "140 kW",
      color: "šedá",
      technical_certificate_number: "UT654321",
      key_count: "1",
      agreed_value: "450000",
    },
    client_snapshot: {
      client_id: 1,
      client_type: "individual",
      full_name: "Jan Novák",
      company_name: "",
      birth_date: "1985-04-12",
      personal_id_number: "",
      identity_document_number: "123456789",
      tax_id: "",
      vat_id: "",
      address: "Dlouhá 10",
      city: "Praha",
      postal_code: "11000",
      country: "CZ",
      phone: "+420777000111",
      email: "jan@example.com",
      bank_account: "123/0100",
    },
    company_snapshot: {
      name: "RemAuto s.r.o.",
      ico: "12345678",
      dic: "CZ12345678",
      address: "Hlavní 1",
      city: "Praha",
      postal_code: "11000",
      country: "CZ",
      phone: "+420123456789",
      email: "info@remauto.cz",
      bank_account: "987654321/0100",
    },
    vehicle_a_value: 520000,
    vehicle_b_value: 450000,
    additional_payment: 70000,
    additional_payment_words: "sedmdesát tisíc korun",
    currency: "CZK",
    additional_payment_payer: "customer",
    payment_method: "bank_transfer",
    payment_account: "123456789/0100",
    payment_due_date: "2026-08-10",
    payment_paid_at: null,
    payment_status: "unpaid",
    custom_payment_method: null,
    signing_place: "Praha",
    signing_date: "2026-07-26",
    vehicle_a_known_defects: null,
    vehicle_b_known_defects: null,
    legal_defects_notes: null,
    service_budget: 15000,
    additional_terms: null,
    handover_date: "2026-08-15",
    handover_time: "10:00",
    handover_place: "Praha",
    handover_notes: null,
    cancelled_reason: null,
    signed_at: null,
    assigned_to: null,
    created_by: null,
    archived_at: null,
    created_at: "2026-07-26T10:00:00.000Z",
    updated_at: "2026-07-26T10:00:00.000Z",
    handover_details: [
      {
        id: "1",
        deal_id: "00000000-0000-0000-0000-000000000001",
        vehicle_side: "vehicle_a",
        handover_datetime: "2026-08-15T10:30:00.000Z",
        mileage: 85100,
        fuel_level: "half",
        key_count: 2,
        documents: ["orv", "service_book"],
        accessories: "Podlahové koberce",
        visible_damage: "",
        notes: null,
        created_at: "",
        updated_at: "",
      },
    ],
  };
}

function main() {
  testPlaceholderRecognition();
  testServiceBudgetPlaceholders();
  testFinalPlaceholderRecognition();
  testAliases();
  testCheckboxOutputs();
  testFormatting();
  testFuelEnginePowerFormatting();
  testHandoverDocumentsCheckboxes();
  testHandoverFallbacks();
  testAliasDataAndOverrides();
  testDerivedVehicleFields();
  testEmptyFallbacks();
  console.log("All vehicle exchange placeholder tests passed.");
}

main();
