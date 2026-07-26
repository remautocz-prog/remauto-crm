import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const [user, t, tFields, tCommon] = await Promise.all([
    getCurrentUser(),
    getTranslations("settings"),
    getTranslations("fields"),
    getTranslations("common"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">{tFields("email")}</span>
            <span className="text-white">{user?.email ?? tCommon("dash")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t("userId")}</span>
            <span className="font-mono text-xs text-zinc-300">
              {user?.id ?? tCommon("dash")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t("authProvider")}</span>
            <span className="text-white">{tCommon("supabase")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
