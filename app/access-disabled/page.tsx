import Link from "next/link";
import { Ban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserNavSignOutButton } from "@/components/auth/user-nav-sign-out-button";

export default async function AccessDisabledPage() {
  const t = await getTranslations("access");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <Card className="w-full border-zinc-800 bg-zinc-900/70">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
            <Ban className="h-6 w-6" />
          </div>
          <CardTitle className="text-white">{t("accountDisabledTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-zinc-400">
          <p>{t("accountDisabledDescription")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <UserNavSignOutButton label={t("signOut")} />
            <Button asChild variant="secondary">
              <Link href="/login">{t("backToLogin")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
