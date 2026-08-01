export const DETAILING_EMPLOYEE_FALLBACK_LABEL = "Employee";

export function getDetailingEmployeeDisplayName(input: {
  display_name?: string | null;
  profile?: { full_name?: string | null } | null;
}): string {
  return (
    input.profile?.full_name?.trim() ||
    input.display_name?.trim() ||
    DETAILING_EMPLOYEE_FALLBACK_LABEL
  );
}

export function getDetailingProfileOptionLabel(profile: {
  full_name?: string | null;
}): string {
  return profile.full_name?.trim() || DETAILING_EMPLOYEE_FALLBACK_LABEL;
}
