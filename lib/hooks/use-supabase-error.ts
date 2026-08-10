"use client";

import { useTranslations } from "next-intl";
import {
  classifyUserError,
  isInternalErrorText,
} from "@/lib/utils/user-error-classifier";

export function useFormatSupabaseError() {
  const tErrors = useTranslations("errors");
  const tAccess = useTranslations("access");

  return (error: { message?: string; code?: string; status?: number }) => {
    console.error("[user-error]", {
      code: error.code,
      message: error.message,
      status: error.status,
    });

    const classified = classifyUserError(error);

    switch (classified.kind) {
      case "permission_denied":
        return tAccess("permissionDenied");
      case "duplicate_key":
        return tErrors("duplicateKey");
      case "foreign_key":
        return tAccess("deleteBlockedDependencies");
      case "not_null":
        return tErrors("notNull");
      case "check_violation":
        return tErrors("invalidSyntax");
      case "invite_duplicate_email":
        return tAccess("inviteEmailAlreadyRegistered");
      case "invite_rate_limit":
        return tAccess("inviteRateLimited");
      case "invite_redirect":
        return tAccess("inviteRedirectNotAllowed");
      case "network_failure":
        return tErrors("operationFailed");
      case "auth_invalid_credentials":
        return tErrors("invalidCredentials");
      default:
        if (error.message && !isInternalErrorText(error.message)) {
          return error.message;
        }
        return tErrors("generic");
    }
  };
}
