"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  mapAuthExchangeError,
  resolveInviteCallbackError,
} from "@/lib/auth/invite-callback-errors";
import {
  AUTH_SET_PASSWORD_PATH,
  shouldSetPassword,
} from "@/lib/auth/invite-flow";
import { createClient } from "@/lib/supabase/client";
import { resolveClientPostAuthRedirect } from "@/lib/auth/client-post-auth-redirect";
import { LoadingScreen } from "@/components/shared/loading-screen";

function readHashParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

function clearUrlHash() {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

function resolveRedirectTarget(next: string | null): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

async function resolveSafePostAuthDestination(
  supabase: ReturnType<typeof createClient>,
  redirectNext: string | null
): Promise<string> {
  return resolveClientPostAuthRedirect(
    supabase,
    resolveRedirectTarget(redirectNext)
  );
}

export function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function completeSession(destination: string) {
      if (cancelled) return;
      router.replace(destination);
      router.refresh();
    }

    async function redirectInviteError(reason: string) {
      if (cancelled) return;
      router.replace(`/auth/invite-error?reason=${encodeURIComponent(reason)}`);
    }

    async function run() {
      const supabase = createClient();
      const hashParams = readHashParams();
      const next = searchParams.get("next");
      const queryLinkType = searchParams.get("type");

      async function resolvePostAuthDestination(
        linkType: string | null,
        redirectNext: string | null
      ): Promise<string> {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (shouldSetPassword(linkType, user)) {
          return AUTH_SET_PASSWORD_PATH;
        }

        return resolveSafePostAuthDestination(supabase, redirectNext);
      }

      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");
      if (hashError || hashErrorCode) {
        clearUrlHash();
        await redirectInviteError(
          resolveInviteCallbackError({
            error: hashError,
            errorCode: hashErrorCode,
            errorDescription: hashParams.get("error_description"),
          })
        );
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashLinkType = hashParams.get("type");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        clearUrlHash();

        if (error) {
          await redirectInviteError(mapAuthExchangeError(error));
          return;
        }

        await completeSession(
          await resolvePostAuthDestination(hashLinkType ?? queryLinkType, next)
        );
        return;
      }

      const queryError = searchParams.get("error");
      const queryErrorCode = searchParams.get("error_code");
      if (queryError || queryErrorCode) {
        await redirectInviteError(
          resolveInviteCallbackError({
            error: queryError,
            errorCode: queryErrorCode,
            errorDescription: searchParams.get("error_description"),
          })
        );
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          await redirectInviteError(mapAuthExchangeError(error));
          return;
        }

        await completeSession(
          await resolvePostAuthDestination(queryLinkType, next)
        );
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await completeSession(
          await resolvePostAuthDestination(queryLinkType, next)
        );
        return;
      }

      await redirectInviteError("invalid");
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <LoadingScreen messageKey="signIn" />;
}
