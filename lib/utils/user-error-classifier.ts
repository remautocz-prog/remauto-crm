export type UserErrorKind =
  | "permission_denied"
  | "duplicate_key"
  | "foreign_key"
  | "not_null"
  | "check_violation"
  | "invite_duplicate_email"
  | "invite_rate_limit"
  | "invite_redirect"
  | "network_failure"
  | "auth_invalid_credentials"
  | "unknown";

export type ClassifiedUserError = {
  kind: UserErrorKind;
  code?: string;
  message?: string;
};

function readErrorRecord(error: unknown): Record<string, unknown> | null {
  if (error == null) return null;
  if (typeof error === "object") return error as Record<string, unknown>;
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return { message: String(error) };
}

function combinedHaystack(record: Record<string, unknown>): string {
  return [
    record.message,
    record.error_description,
    record.error,
    record.code,
    record.name,
    record.details,
    record.hint,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function readCode(record: Record<string, unknown>): string | undefined {
  const code = record.code;
  return typeof code === "string" ? code : undefined;
}

function readMessage(record: Record<string, unknown>): string | undefined {
  const message = record.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  return undefined;
}

/** Classify backend/auth errors without exposing internals to the UI. */
export function classifyUserError(error: unknown): ClassifiedUserError {
  const record = readErrorRecord(error);
  if (!record) {
    return { kind: "unknown" };
  }

  const code = readCode(record);
  const message = readMessage(record);
  const haystack = combinedHaystack(record);

  if (code === "42501" || haystack.includes("42501") || haystack.includes("row-level security")) {
    return { kind: "permission_denied", code, message };
  }

  if (code === "23503") {
    return { kind: "foreign_key", code, message };
  }

  if (code === "23505") {
    return { kind: "duplicate_key", code, message };
  }

  if (code === "23502") {
    return { kind: "not_null", code, message };
  }

  if (code === "23514") {
    return { kind: "check_violation", code, message };
  }

  if (
    haystack.includes("rate limit") ||
    haystack.includes("too many requests") ||
    haystack.includes("email rate limit") ||
    code === "429" ||
    record.status === 429
  ) {
    return { kind: "invite_rate_limit", code, message };
  }

  if (
    haystack.includes("redirect") &&
    (haystack.includes("not allowed") || haystack.includes("invalid"))
  ) {
    return { kind: "invite_redirect", code, message };
  }

  if (
    haystack.includes("user already registered") ||
    haystack.includes("already been registered") ||
    haystack.includes("email already") ||
    haystack.includes("already exists") ||
    code === "email_exists" ||
    code === "user_already_exists"
  ) {
    return { kind: "invite_duplicate_email", code, message };
  }

  if (
    haystack.includes("invalid login credentials") ||
    haystack.includes("invalid email or password")
  ) {
    return { kind: "auth_invalid_credentials", code, message };
  }

  if (
    haystack.includes("authretryablefetcherror") ||
    haystack.includes("fetch failed") ||
    haystack.includes("network") ||
    haystack.includes("failed to fetch") ||
    haystack.includes("connection") ||
    haystack.includes("timeout") ||
    haystack.includes("temporarily unavailable")
  ) {
    return { kind: "network_failure", code, message };
  }

  if (
    haystack.includes("sqlstate") ||
    haystack.includes("violates") ||
    haystack.includes("constraint") ||
    haystack.includes("duplicate key") ||
    /\bPGRST\d+\b/i.test(haystack) ||
    /\b\d{5}\b/.test(haystack)
  ) {
    return { kind: "unknown", code, message };
  }

  return { kind: "unknown", code, message };
}

export function isInternalErrorText(value: string | undefined): boolean {
  if (!value) return true;
  const text = value.trim().toLowerCase();
  if (!text) return true;
  if (["0", "1", "true", "false", "null", "undefined", "unknown error"].includes(text)) {
    return true;
  }
  if (text.includes("sqlstate") || text.includes("42501") || text.includes("23514")) {
    return true;
  }
  if (text.includes("violates") && text.includes("constraint")) return true;
  if (text.includes("authretryablefetcherror")) return true;
  if (text.includes("supabase auth inviteuserbyemail")) return true;
  if (text.includes("service_role") || text.includes("service-role")) return true;
  return false;
}
