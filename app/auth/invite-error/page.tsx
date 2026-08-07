import type { Metadata } from "next";
import Link from "next/link";
import { MailWarning } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { parseInviteCallbackReason } from "@/lib/auth/invite-callback-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const reason = parseInviteCallbackReason(params.reason);
  const t = await getTranslations("auth");

  const titleKey =
    reason === "expired"
      ? "inviteExpiredTitle"
      : reason === "used"
        ? "inviteUsedTitle"
        : "inviteInvalidTitle";

  return { title: t(titleKey) };
}

export default async function InviteErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const [params, t, tAccess] = await Promise.all([
    searchParams,
    getTranslations("auth"),
    getTranslations("access"),
  ]);

  const reason = parseInviteCallbackReason(params.reason);

  const titleKey =
    reason === "expired"
      ? "inviteExpiredTitle"
      : reason === "used"
        ? "inviteUsedTitle"
        : "inviteInvalidTitle";

  const descriptionKey =
    reason === "expired"
      ? "inviteExpiredDescription"
      : reason === "used"
        ? "inviteUsedDescription"
        : "inviteInvalidDescription";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(220_38_38_/_0.12),_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,_transparent,_rgb(0_0_0_/_0.8))]" />

      <Card className="relative w-full max-w-lg border-zinc-800 bg-zinc-900/90">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
            <MailWarning className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-semibold text-white">{t(titleKey)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center text-sm text-zinc-400">
          <p>{t(descriptionKey)}</p>
          <p>{t("requestNewInvitationHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/login">{t("requestNewInvitation")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">{tAccess("backToLogin")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
