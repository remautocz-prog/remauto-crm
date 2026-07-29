import type {
  PoaAuthorizationScope,
  PoaNotarizedOption,
  PoaPartyType,
  PoaValidityType,
} from "@/lib/constants/power-of-attorney";

export type PowerOfAttorneyPartyInput = {
  type: PoaPartyType;
  full_name: string;
  company_name: string;
  birth_date: string;
  personal_id_number: string;
  identity_document_number: string;
  ico: string;
  dic: string;
  address: string;
  contact_address: string;
  represented_by: string;
  representative_position: string;
  registry_information: string;
  phone: string;
  email: string;
  bank_account: string;
  country: string;
  identification_notes: string;
  position_or_relationship: string;
  authorization_notes: string;
};

export type PowerOfAttorneyVehicleInput = {
  make: string;
  model: string;
  vin: string;
  registration_plate: string;
  first_registration_date: string;
  technical_certificate_number: string;
  color: string;
  mileage: string;
  fuel_type: string;
  engine_capacity: string;
  power_kw: string;
  registered_owner_name: string;
  registered_owner_address: string;
  registered_owner_identification: string;
  registration_country: string;
};

export type PowerOfAttorneyFormInput = {
  principal: PowerOfAttorneyPartyInput;
  authorized_person: PowerOfAttorneyPartyInput;
  vehicle: PowerOfAttorneyVehicleInput;
  authorization_scopes: PoaAuthorizationScope[];
  authorization_scope_text: string;
  additional_authorization_text: string;
  signing_place: string;
  signing_date: string;
  valid_from: string;
  valid_until: string;
  validity_type: PoaValidityType;
  notarized_signature: PoaNotarizedOption;
  original_count: string;
  additional_notes: string;
};

export type PowerOfAttorneySnapshot = PowerOfAttorneyFormInput & {
  document_type: "power_of_attorney";
};
