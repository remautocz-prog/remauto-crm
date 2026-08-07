"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/shared/loading-screen";

export function AuthHashRedirect({ children }: { children: React.ReactNode }) {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) {
      return;
    }

    setRedirecting(true);
    window.location.replace(`/auth/callback${hash}`);
  }, []);

  if (redirecting) {
    return <LoadingScreen messageKey="signIn" />;
  }

  return children;
}
