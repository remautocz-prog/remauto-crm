import "server-only";

import { getTranslations } from "next-intl/server";
import {
  classifyUserError,
  isInternalErrorText,
  type UserErrorKind,
} from "@/lib/utils/user-error-classifier";

type UserFacingErrorMessages = Record<UserErrorKind, string> & {
  deleteFailed: string;
};

async function loadUserFacingErrorMessages(): Promise<UserFacingErrorMessages> {
  const [tErrors, tAccess] = await Promise.all([
    getTranslations("errors"),
    getTranslations("access"),
  ]);

  return {
    permission_denied: tAccess("permissionDenied"),
    duplicate_key: tErrors("duplicateKey"),
    foreign_key: tAccess("deleteBlockedDependencies"),
    not_null: tErrors("notNull"),
    check_violation: tErrors("invalidSyntax"),
    invite_duplicate_email: tAccess("inviteEmailAlreadyRegistered"),
    invite_rate_limit: tAccess("inviteRateLimited"),
    invite_redirect: tAccess("inviteRedirectNotAllowed"),
    network_failure: tErrors("operationFailed"),
    auth_invalid_credentials: tErrors("invalidCredentials"),
    unknown: tErrors("generic"),
    deleteFailed: tAccess("deleteFailed"),
  };
}

function logUserFacingError(error: unknown, classified: ReturnType<typeof classifyUserError>) {
  console.error("[user-error]", {
    kind: classified.kind,
    code: classified.code,
    message: classified.message,
    raw:
      error instanceof Error
        ? { name: error.name, message: error.message }
        : typeof error === "object" && error
          ? error
          : String(error),
  });
}

/** Normalize any backend/auth error into a safe user-facing message. */
export async function formatUserFacingError(error: unknown): Promise<string> {
  const classified = classifyUserError(error);
  logUserFacingError(error, classified);
  const messages = await loadUserFacingErrorMessages();
  return messages[classified.kind];
}

/** Delete-specific wrapper preserving dependency messaging. */
export async function formatDeleteUserFacingError(error: {
  code?: string;
  message?: string;
}): Promise<string> {
  return formatUserFacingError(error);
}

/** Map auth invite/admin API errors to safe messages. */
export async function formatInviteUserFacingError(error: unknown): Promise<string> {
  return formatUserFacingError(error);
}

/** Client-safe normalization when the server already returned a string. */
export function sanitizeExistingUserMessage(
  message: string | undefined,
  fallback: string
): string {
  if (!message || isInternalErrorText(message)) {
    return fallback;
  }
  return message;
}
