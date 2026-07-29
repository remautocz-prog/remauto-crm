import { getClientLabelFromSnapshot } from "@/lib/deals/snapshots";
import {
  buildPaymentAmountInWords,
  combineMakeModel,
  emptyText,
  formatBirthDateOrIco,
  formatCzechDate,
  formatCzechDateTime,
  formatDealCurrencyAmount,
  formatEnginePower,
  formatFuelEnginePower,
  formatHandoverDocumentsCheckboxes,
  formatMileageNumber,
  formatPaymentMethodCheckboxes,
  formatPaymentPayerCheckboxes,
  formatRegistrationPayerCheckboxes,
  resolveHandoverDate,
  type RegistrationPayer,
} from "@/lib/documents/vehicle-exchange-formatters";
import { formatHandoverFuelLevelForTemplate } from "@/lib/deals/handover-labels";
import type { DealCurrency } from "@/lib/constants/deals";
import type { DealHandoverDetail, DealWithRelations } from "@/lib/types/deals";
import type { DocumentTemplateData } from "@/lib/types/document-templates";
import type { AppLocale } from "@/i18n/config";

function mapVehicleSide(
  snapshot: DealWithRelations["vehicle_a_snapshot"],
  knownDefects: string,
  locale: AppLocale,
  currency: DealCurrency
) {
  const make = emptyText(snapshot.make);
  const model = emptyText(snapshot.model);
  const registrationPlate = emptyText(snapshot.registration_plate);
  const fuelType = emptyText(snapshot.fuel_type);
  const engineCapacity = emptyText(snapshot.engine_capacity);
  const powerKw = emptyText(snapshot.power_kw);
  const technicalCertificate = emptyText(snapshot.technical_certificate_number);
  const agreedValueRaw = snapshot.agreed_value ? Number(snapshot.agreed_value) : null;
  const mileage = formatMileageNumber(snapshot.mileage, locale);

  const shared = {
    make,
    model,
    full_name: emptyText(snapshot.full_name) || combineMakeModel(make, model),
    vin: emptyText(snapshot.vin),
    registration_plate: registrationPlate,
    registration_number: registrationPlate,
    first_registration_date: formatCzechDate(snapshot.first_registration_date),
    mileage,
    fuel_type: fuelType,
    fuel: fuelType,
    engine_capacity: engineCapacity,
    engine_volume: engineCapacity,
    power_kw: formatEnginePower(powerKw),
    engine_power: formatEnginePower(powerKw),
    color: emptyText(snapshot.color),
    technical_certificate_number: technicalCertificate,
    technical_document_number: technicalCertificate,
    key_count: emptyText(snapshot.key_count),
    agreed_value: emptyText(snapshot.agreed_value),
    agreed_value_formatted: formatDealCurrencyAmount(agreedValueRaw, currency, locale),
    known_defects: emptyText(knownDefects),
    make_model: combineMakeModel(make, model),
    fuel_engine_power: formatFuelEnginePower({
      fuel: fuelType,
      engineVolume: engineCapacity,
      enginePower: powerKw,
      locale,
    }),
  };

  return shared;
}

function mapHandoverSide(
  details: DealHandoverDetail[] | undefined,
  side: "vehicle_a" | "vehicle_b",
  locale: AppLocale
) {
  const row = details?.find((item) => item.vehicle_side === side);
  return {
    datetime: formatCzechDateTime(row?.handover_datetime),
    mileage: row?.mileage != null ? formatMileageNumber(row.mileage, locale) : "",
    fuel_level: formatHandoverFuelLevelForTemplate(row?.fuel_level, locale),
    key_count: row?.key_count != null ? String(row.key_count) : "",
    documents: row?.documents?.length
      ? row.documents.join(", ")
      : "",
    documents_checkboxes: formatHandoverDocumentsCheckboxes(row?.documents, row?.notes),
    accessories: emptyText(row?.accessories),
    visible_damage: emptyText(row?.visible_damage),
  };
}

function buildCustomerSection(deal: DealWithRelations) {
  const client = deal.client_snapshot;
  const address = [client.address, client.city, client.postal_code, client.country]
    .map((part) => emptyText(part))
    .filter(Boolean)
    .join(", ");

  return {
    full_name: getClientLabelFromSnapshot(client),
    address,
    bank_account: emptyText(client.bank_account),
    birth_date_or_ico: formatBirthDateOrIco({
      clientType: client.client_type,
      birthDate: client.birth_date,
      taxId: client.tax_id,
    }),
    document_number: emptyText(client.identity_document_number),
    email: emptyText(client.email),
    phone: emptyText(client.phone),
  };
}

function buildPaymentSection(deal: DealWithRelations, locale: AppLocale) {
  const payerCheckboxes = formatPaymentPayerCheckboxes(deal.additional_payment_payer);
  const methodCheckboxes = formatPaymentMethodCheckboxes(deal.payment_method);

  return {
    amount_formatted: formatDealCurrencyAmount(
      deal.additional_payment,
      deal.currency,
      locale
    ),
    amount_in_words: buildPaymentAmountInWords(
      deal.additional_payment,
      deal.currency,
      locale,
      deal.additional_payment_words
    ),
    ...payerCheckboxes,
    ...methodCheckboxes,
    bank_account: emptyText(deal.payment_account),
    due_date: formatCzechDate(deal.payment_due_date),
    other_text:
      deal.payment_method === "other" ? emptyText(deal.custom_payment_method) : "",
    other_method:
      deal.payment_method === "other" ? emptyText(deal.custom_payment_method) : "",
  };
}

function buildRegistrationSection(): Record<string, string> {
  const payer: RegistrationPayer = "";
  return {
    ...formatRegistrationPayerCheckboxes(payer),
    other_text: "",
  };
}

function buildHandoverGeneralSection(
  deal: DealWithRelations,
  customerFullName: string,
  companyRepresentative: string
) {
  const vehicleADetail = deal.handover_details?.find(
    (item) => item.vehicle_side === "vehicle_a"
  );
  const vehicleBDetail = deal.handover_details?.find(
    (item) => item.vehicle_side === "vehicle_b"
  );
  const deliveryDate = resolveHandoverDate({
    handoverDate: deal.handover_date,
    vehicleADatetime: vehicleADetail?.handover_datetime,
    vehicleBDatetime: vehicleBDetail?.handover_datetime,
  });
  const deliveryPlace = emptyText(deal.handover_place);

  return {
    delivery_date: deliveryDate,
    date: deliveryDate,
    delivery_place: deliveryPlace,
    place: deliveryPlace,
    deliverer_name: emptyText(companyRepresentative),
    receiver_name: emptyText(customerFullName),
    notes: emptyText(deal.handover_notes),
    notes_continued: "",
  };
}

export function buildDealDocumentTemplateData(
  deal: DealWithRelations,
  locale: AppLocale
): DocumentTemplateData {
  const client = deal.client_snapshot;
  const company = deal.company_snapshot;
  const currency = deal.currency;

  const customer = buildCustomerSection(deal);
  const payment = buildPaymentSection(deal, locale);
  const registration = buildRegistrationSection();
  const companyRepresentative = "";
  const handoverGeneral = buildHandoverGeneralSection(
    deal,
    customer.full_name,
    companyRepresentative
  );
  const approvedServiceBudgetFormatted = formatDealCurrencyAmount(
    deal.service_budget,
    currency,
    locale
  );

  return {
    company: {
      name: emptyText(company.name),
      ico: emptyText(company.ico),
      dic: emptyText(company.dic),
      address: emptyText(company.address),
      city: emptyText(company.city),
      phone: emptyText(company.phone),
      email: emptyText(company.email),
      bank_account: emptyText(company.bank_account),
      representative: "",
    },
    client: {
      full_name: emptyText(client.full_name),
      company_name: emptyText(client.company_name),
      birth_date: formatCzechDate(client.birth_date),
      id_number: emptyText(client.personal_id_number),
      identity_document_number: emptyText(client.identity_document_number),
      address: customer.address,
      phone: emptyText(client.phone),
      email: emptyText(client.email),
      bank_account: emptyText(client.bank_account),
    },
    customer,
    vehicle: mapVehicleSide(deal.vehicle_a_snapshot, "", locale, currency),
    order: {
      number: deal.deal_number,
      total_price: formatDealCurrencyAmount(deal.additional_payment, currency, locale),
      paid_amount:
        deal.payment_status === "paid"
          ? formatDealCurrencyAmount(deal.additional_payment, currency, locale)
          : "",
      outstanding_balance:
        deal.payment_status === "paid" || deal.payment_status === "not_applicable"
          ? ""
          : formatDealCurrencyAmount(deal.additional_payment, currency, locale),
    },
    document: {
      generated_date: formatCzechDate(new Date().toISOString()),
      generated_city: emptyText(deal.signing_place),
      signing_date: formatCzechDate(deal.signing_date),
      additional_notes: emptyText(deal.additional_terms),
    },
    employee: {
      full_name: emptyText(deal.assignee?.full_name),
    },
    deal: {
      number: deal.deal_number,
      type: deal.deal_type,
      signing_date: formatCzechDate(deal.signing_date),
      signing_place: emptyText(deal.signing_place),
      currency: deal.currency,
      vehicle_a_value: formatDealCurrencyAmount(deal.vehicle_a_value, currency, locale),
      vehicle_b_value: formatDealCurrencyAmount(deal.vehicle_b_value, currency, locale),
      additional_payment: formatDealCurrencyAmount(deal.additional_payment, currency, locale),
      additional_payment_words: emptyText(deal.additional_payment_words),
      additional_payment_payer: emptyText(deal.additional_payment_payer),
      payment_method: emptyText(deal.payment_method),
      payment_account: emptyText(deal.payment_account),
      payment_due_date: formatCzechDate(deal.payment_due_date),
      payment_status: emptyText(deal.payment_status),
      vehicle_a_known_defects: emptyText(deal.vehicle_a_known_defects),
      vehicle_b_known_defects: emptyText(deal.vehicle_b_known_defects),
      legal_defects_notes: emptyText(deal.legal_defects_notes),
      service_budget: approvedServiceBudgetFormatted,
      service_budget_formatted: approvedServiceBudgetFormatted,
      additional_terms: emptyText(deal.additional_terms),
      handover_date: formatCzechDate(deal.handover_date),
      handover_time: emptyText(deal.handover_time),
      handover_place: emptyText(deal.handover_place),
      handover_notes: emptyText(deal.handover_notes),
    },
    vehicle_a: mapVehicleSide(
      deal.vehicle_a_snapshot,
      deal.vehicle_a_known_defects ?? "",
      locale,
      currency
    ),
    vehicle_b: mapVehicleSide(
      deal.vehicle_b_snapshot,
      deal.vehicle_b_known_defects ?? "",
      locale,
      currency
    ),
    payment,
    registration,
    service: {
      approved_budget_formatted: approvedServiceBudgetFormatted,
    },
    handover: {
      ...handoverGeneral,
      vehicle_a: mapHandoverSide(deal.handover_details, "vehicle_a", locale),
      vehicle_b: mapHandoverSide(deal.handover_details, "vehicle_b", locale),
    },
  };
}
