import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultRouteForRole, parseAppRole } from "@/lib/auth/roles";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const role = parseAppRole(profile?.role as string | undefined);
  const isActive = profile?.is_active !== false && role !== "inactive";

  redirect(isActive ? getDefaultRouteForRole(role) : "/access-disabled");
}
