import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthCallbackHandler } from "@/components/auth/auth-callback-handler";
import { LoadingScreen } from "@/components/shared/loading-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loading");
  return { title: t("signIn") };
}

export default function AuthCallbackPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(220_38_38_/_0.12),_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,_transparent,_rgb(0_0_0_/_0.8))]" />
      <Suspense fallback={<LoadingScreen messageKey="signIn" />}>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
