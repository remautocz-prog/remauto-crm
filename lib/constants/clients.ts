export const CLIENT_TYPE_VALUES = ["individual", "company"] as const;
export type ClientType = (typeof CLIENT_TYPE_VALUES)[number];

export const CLIENT_PREFERRED_LANGUAGE_VALUES = ["ru", "cs", "en"] as const;
export type ClientPreferredLanguage = (typeof CLIENT_PREFERRED_LANGUAGE_VALUES)[number];

export const CLIENT_SORT_VALUES = [
  "newest",
  "name",
  "company",
  "last_activity",
] as const;

export type ClientSortValue = (typeof CLIENT_SORT_VALUES)[number];

export const DEFAULT_CLIENT_TYPE: ClientType = "individual";
