import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserAccess } from "@/lib/auth/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const [access, t, tFields, tCommon, tAccess, tRoles] = await Promise.all([
    getCurrentUserAccess(),
    getTranslations("settings"),
    getTranslations("fields"),
    getTranslations("common"),
    getTranslations("access"),
    getTranslations("roles"),
  ]);

  const canManageTemplates = access?.permissions.has("settings.manage") ?? false;
  const canManageUsers = access?.permissions.has("users.view") ?? false;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {canManageTemplates ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("documentTemplatesLink")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/settings/templates">{t("documentTemplatesLink")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {canManageUsers ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">{tAccess("employees")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/settings/users">{tAccess("employees")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">{tFields("email")}</span>
            <span className="text-white">{access?.email ?? tCommon("dash")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t("userId")}</span>
            <span className="font-mono text-xs text-zinc-300">
              {access?.userId ?? tCommon("dash")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{tAccess("role")}</span>
            <span className="text-white">
              {access ? tRoles(access.role) : tCommon("dash")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
