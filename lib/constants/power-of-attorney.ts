export const POA_PARTY_TYPES = ["individual", "company"] as const;
export type PoaPartyType = (typeof POA_PARTY_TYPES)[number];

export const POA_VALIDITY_TYPES = [
  "one_time",
  "until_date",
  "indefinite",
  "until_revoked",
] as const;
export type PoaValidityType = (typeof POA_VALIDITY_TYPES)[number];

export const POA_NOTARIZED_OPTIONS = ["yes", "no", "unknown"] as const;
export type PoaNotarizedOption = (typeof POA_NOTARIZED_OPTIONS)[number];

export const POA_AUTHORIZATION_SCOPES = [
  "registry",
  "owner_change",
  "operator_change",
  "registration",
  "deregistration",
  "documents",
  "plates",
  "replacement_plates",
  "stk",
  "emissions",
  "evidential",
  "insurance",
  "customs",
  "import_export",
  "sale",
  "purchase",
  "handover",
  "sign_documents",
  "receive_payments",
  "other",
] as const;
export type PoaAuthorizationScope = (typeof POA_AUTHORIZATION_SCOPES)[number];

export const POA_DOCUMENT_TYPE = "power_of_attorney" as const;
