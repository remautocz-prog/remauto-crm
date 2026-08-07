"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useFormatSupabaseError } from "@/lib/hooks/use-supabase-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingScreen } from "@/components/shared/loading-screen";

export function SetPasswordForm() {
  const router = useRouter();
  const tAuth = useTranslations("auth");
  const tFields = useTranslations("fields");
  const tActions = useTranslations("actions");
  const formatSupabaseError = useFormatSupabaseError();

  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        router.replace("/auth/invite-error?reason=invalid");
        return;
      }

      setCheckingSession(false);
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(tAuth("setPasswordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(tAuth("setPasswordMismatch"));
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const existingMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          ...existingMeta,
          password_set: true,
        },
      });

      if (updateError) {
        setError(formatSupabaseError(updateError));
        return;
      }

      router.replace("/");
      router.refresh();
    });
  }

  if (checkingSession) {
    return <LoadingScreen messageKey="signIn" />;
  }

  return (
    <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white">
          R
        </div>
        <CardTitle className="text-2xl font-semibold text-white">
          {tAuth("setPasswordTitle")}
        </CardTitle>
        <CardDescription>{tAuth("setPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{tFields("password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{tAuth("confirmPassword")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              disabled={isPending}
            />
          </div>
          {error ? (
            <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {tAuth("setPasswordSubmitting")}
              </>
            ) : (
              tAuth("setPasswordSubmit")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
