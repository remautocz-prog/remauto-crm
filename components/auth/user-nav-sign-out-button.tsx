"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function UserNavSignOutButton({ label }: { label?: string }) {
  const router = useRouter();
  const tActions = useTranslations("actions");
  const buttonLabel = label ?? tActions("signOut");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={handleSignOut}>
      {buttonLabel}
    </Button>
  );
}
