import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasAdminClient(): boolean {
  return createAdminClient() !== null;
}

/** Redirect target for Supabase Auth invite / magic-link emails. */
export function getAuthCallbackUrl(path = "/auth/callback"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return `${configured}${normalizedPath}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}${normalizedPath}`;
  }

  return `http://localhost:3000${normalizedPath}`;
}
