import type { User } from "@supabase/supabase-js";

export function shouldSetPassword(
  linkType: string | null | undefined,
  user: User | null | undefined
): boolean {
  if (linkType === "invite" || linkType === "recovery") {
    return true;
  }

  if (!user) {
    return false;
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return metadata.password_set === false;
}

export const AUTH_SET_PASSWORD_PATH = "/auth/set-password";
