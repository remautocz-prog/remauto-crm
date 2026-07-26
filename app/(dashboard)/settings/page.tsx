import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/dashboard";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account and application preferences."
      />
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Email</span>
            <span className="text-white">{user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">User ID</span>
            <span className="font-mono text-xs text-zinc-300">
              {user?.id ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Auth provider</span>
            <span className="text-white">Supabase</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
