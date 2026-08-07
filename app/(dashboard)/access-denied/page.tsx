import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserAccess } from "@/lib/auth/access";
import { getDefaultRouteForRole } from "@/lib/auth/roles";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [t, access, params] = await Promise.all([
    getTranslations("access"),
    getCurrentUserAccess(),
    searchParams,
  ]);

  const fallbackRoute = access
    ? getDefaultRouteForRole(access.role)
    : "/login";
  const homeHref = params.from?.startsWith("/") ? params.from : fallbackRoute;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center">
      <Card className="w-full border-zinc-800 bg-zinc-900/70">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/15 text-red-500">
            <ShieldX className="h-6 w-6" />
          </div>
          <CardTitle className="text-white">{t("accessDeniedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-zinc-400">
          <p>{t("sectionAccessDenied")}</p>
          <Button asChild>
            <Link href={homeHref}>{t("goToHomeModule")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
