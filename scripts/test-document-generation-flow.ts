import { buildDealDocumentTemplateData } from "@/lib/deals/template-data";
import {
  applyTemplateOverrides,
  buildOverridesFromEditedSnapshot,
  emptyDocumentTemplateData,
  resolveFinalDocumentSnapshot,
} from "@/lib/documents/apply-template-overrides";
import {
  hasCoreCrmDocumentData,
  isEditedSnapshotUnloadedEmptyForm,
  requiresDealForTemplate,
} from "@/lib/documents/document-generation-validation";
import { applyLegacyPlaceholderAliases } from "@/lib/documents/placeholder-aliases";
import type { DealWithRelations } from "@/lib/types/deals";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
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
      power_kw: "140",
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
    handover_details: [],
  };
}

function testRequiresDealForCrmTemplates() {
  assert(requiresDealForTemplate("vehicle_exchange_agreement", "crm_only"));
  assert(requiresDealForTemplate("vehicle_exchange_agreement", "crm_with_manual_overrides"));
  assert(!requiresDealForTemplate("vehicle_exchange_agreement", "manual_only"));
  assert(!requiresDealForTemplate("power_of_attorney", "crm_only"));
}

function testEmptyEditedSnapshotDoesNotWipeCrmData() {
  const base = buildDealDocumentTemplateData(createMockDeal(), "cs");
  const emptyForm = emptyDocumentTemplateData();

  assert(isEditedSnapshotUnloadedEmptyForm(base, emptyForm));
  const resolved = resolveFinalDocumentSnapshot(base, emptyForm);
  assert(hasCoreCrmDocumentData(resolved));
  assert(resolved.deal?.number === "SM-2026-0001");
  assert(resolved.customer?.full_name === "Jan Novák");
}

function testManualOverrideDeepMerge() {
  const base = buildDealDocumentTemplateData(createMockDeal(), "cs");
  const edited = structuredClone(base);
  edited.payment = {
    ...edited.payment!,
    other_text: "Hotově u notáře",
    other_method: "Hotově u notáře",
  };

  const overrides = buildOverridesFromEditedSnapshot(base, edited);
  const merged = applyTemplateOverrides(base, overrides);

  assert(merged.payment?.other_text === "Hotově u notáře");
  assert(merged.payment?.amount_formatted === base.payment?.amount_formatted);
  assert(merged.deal?.number === base.deal?.number);
  assert(merged.vehicle_a?.vin === base.vehicle_a?.vin);
}

function testPartialPaymentOverrideDoesNotEraseCrmPaymentFields() {
  const base = buildDealDocumentTemplateData(createMockDeal(), "cs");
  const merged = applyTemplateOverrides(base, {
    payment: { other_text: "" },
  });

  assert(merged.payment?.other_text === "");
  assert(merged.payment?.amount_formatted === base.payment?.amount_formatted);
  assert(merged.payment?.bank_transfer_checkbox === base.payment?.bank_transfer_checkbox);
}

function testAliasesResolveToPopulatedValues() {
  const base = buildDealDocumentTemplateData(createMockDeal(), "cs");
  const aliased = applyLegacyPlaceholderAliases(base) as Record<string, unknown>;

  assert(String(aliased.dealService_budget_formatted).includes("15"));
  const dealRoot = aliased.deal as Record<string, string>;
  assert(dealRoot.service_budget_formatted === base.service?.approved_budget_formatted);
}

function testCoreDataDetection() {
  const base = buildDealDocumentTemplateData(createMockDeal(), "cs");
  assert(hasCoreCrmDocumentData(base));

  const empty = emptyDocumentTemplateData();
  assert(!hasCoreCrmDocumentData(empty));
}

function main() {
  testRequiresDealForCrmTemplates();
  testEmptyEditedSnapshotDoesNotWipeCrmData();
  testManualOverrideDeepMerge();
  testPartialPaymentOverrideDoesNotEraseCrmPaymentFields();
  testAliasesResolveToPopulatedValues();
  testCoreDataDetection();
  console.log("All document generation flow tests passed.");
}

main();
