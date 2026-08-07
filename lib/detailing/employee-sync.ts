import { DEFAULT_EMPLOYEE_COMMISSION_PERCENT } from "@/lib/constants/detailing";
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures a detailing_employee_settings row exists for a profile.
 * Inserts with defaults when missing; optionally reactivates an existing row.
 */
export async function ensureDetailingEmployeeSettings(
  profileId: string,
  options: { reactivate?: boolean } = {}
): Promise<{ created: boolean }> {
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("detailing_employee_settings")
    .select("id, active")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (readError) throw readError;

  if (existing) {
    if (options.reactivate && !existing.active) {
      const { error: updateError } = await supabase
        .from("detailing_employee_settings")
        .update({ active: true })
        .eq("profile_id", profileId);
      if (updateError) throw updateError;
    }
    return { created: false };
  }

  const { error: insertError } = await supabase.from("detailing_employee_settings").insert({
    profile_id: profileId,
    active: true,
    commission_percent: DEFAULT_EMPLOYEE_COMMISSION_PERCENT,
    display_name: null,
  });

  if (insertError) throw insertError;
  return { created: true };
}

/** Syncs detailing employee settings when RBAC role changes. */
export async function syncDetailingEmployeeOnRoleChange(
  profileId: string,
  previousRole: string | null,
  nextRole: string
): Promise<void> {
  if (nextRole === "detailing") {
    await ensureDetailingEmployeeSettings(profileId, { reactivate: true });
    return;
  }

  if (previousRole === "detailing") {
    await deactivateDetailingEmployeeSettings(profileId);
  }
}

/** Marks detailing settings inactive when a user no longer has the detailing role. */
export async function deactivateDetailingEmployeeSettings(profileId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("detailing_employee_settings")
    .update({ active: false })
    .eq("profile_id", profileId);

  if (error) throw error;
}

/**
 * Creates missing detailing_employee_settings rows for active profiles with role = detailing.
 * Idempotent — never overwrites commission or display_name on existing rows.
 */
export async function syncDetailingEmployeesFromProfiles(): Promise<number> {
  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "detailing")
    .eq("is_active", true);

  if (profilesError) throw profilesError;
  if (!profiles?.length) return 0;

  const profileIds = profiles.map((profile) => profile.id);

  const { data: existing, error: existingError } = await supabase
    .from("detailing_employee_settings")
    .select("profile_id")
    .in("profile_id", profileIds);

  if (existingError) throw existingError;

  const configuredIds = new Set((existing ?? []).map((row) => String(row.profile_id)));
  const missing = profileIds.filter((id) => !configuredIds.has(id));

  if (!missing.length) return 0;

  const { error: insertError } = await supabase.from("detailing_employee_settings").insert(
    missing.map((profileId) => ({
      profile_id: profileId,
      active: true,
      commission_percent: DEFAULT_EMPLOYEE_COMMISSION_PERCENT,
      display_name: null,
    }))
  );

  if (insertError) throw insertError;
  return missing.length;
}
