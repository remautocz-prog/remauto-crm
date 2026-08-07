export type InviteCallbackErrorReason = "expired" | "used" | "invalid";

const EXPIRED_CODES = new Set([
  "otp_expired",
  "flow_state_expired",
  "expired_token",
  "token_expired",
  "session_expired",
]);

const USED_CODES = new Set([
  "otp_disabled",
  "user_already_exists",
  "email_exists",
  "signup_disabled",
]);

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function haystack(
  error: string | null | undefined,
  errorCode: string | null | undefined,
  errorDescription: string | null | undefined
): string {
  return [error, errorCode, errorDescription].map(normalize).join(" ");
}

function matchExpired(text: string): boolean {
  return (
    EXPIRED_CODES.has(text) ||
    text.includes("otp_expired") ||
    text.includes("flow_state_expired") ||
    text.includes("expired") ||
    text.includes("no longer valid") ||
    text.includes("link is invalid or has expired")
  );
}

function matchUsed(text: string): boolean {
  return (
    USED_CODES.has(text) ||
    text.includes("already been used") ||
    text.includes("already used") ||
    text.includes("already registered") ||
    text.includes("already exists")
  );
}

export function resolveInviteCallbackError(input: {
  error?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
}): InviteCallbackErrorReason {
  const code = normalize(input.errorCode);
  const combined = haystack(input.error, input.errorCode, input.errorDescription);

  if (code && EXPIRED_CODES.has(code)) return "expired";
  if (code && USED_CODES.has(code)) return "used";
  if (matchUsed(combined)) return "used";
  if (matchExpired(combined)) return "expired";

  return "invalid";
}

export function mapAuthExchangeError(error: {
  message?: string;
  code?: string;
  status?: number;
}): InviteCallbackErrorReason {
  return resolveInviteCallbackError({
    error: error.code ?? null,
    errorCode: error.code ?? null,
    errorDescription: error.message ?? null,
  });
}

export function isInviteCallbackErrorParam(
  error: string | null,
  errorCode: string | null
): boolean {
  if (!error && !errorCode) return false;

  const combined = haystack(error, errorCode, null);
  if (normalize(error) === "auth_callback_failed") return true;

  return (
    matchExpired(combined) ||
    matchUsed(combined) ||
    normalize(error) === "access_denied" ||
    Boolean(errorCode)
  );
}

export function parseInviteCallbackReason(
  value: string | null | undefined
): InviteCallbackErrorReason {
  if (value === "expired" || value === "used" || value === "invalid") {
    return value;
  }
  return "invalid";
}
