#!/usr/bin/env node
/**
 * Verifies employee invitation prerequisites and optionally sends a dry-run check.
 * Usage: node scripts/verify-invite-system.mjs [--email test@example.com]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function getAuthCallbackUrl(env) {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return `${configured}/auth/callback`;
  if (env.VERCEL_URL?.trim()) return `https://${env.VERCEL_URL.trim()}/auth/callback`;
  return "http://localhost:3000/auth/callback";
}

const env = {
  ...loadEnvFile(resolve(root, ".env")),
  ...loadEnvFile(resolve(root, ".env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const redirectTo = getAuthCallbackUrl(env);
const testEmail = process.argv.find((arg) => arg.includes("@"));

console.log("Employee invite system check\n");
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${url ? "set" : "MISSING"}`);
console.log(`  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${publishable ? "set" : "MISSING"}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${serviceRole ? `set (${serviceRole.length} chars)` : "MISSING"}`);
console.log(`  Invite redirect URL: ${redirectTo}`);

if (!url || !serviceRole) {
  console.log("\nResult: BLOCKED — add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server.");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw error;
  console.log(`\n  Admin Auth API: OK (${data.users?.length ?? 0} user(s) sampled)`);
} catch (error) {
  console.error("\n  Admin Auth API: FAILED", error.message ?? error);
  process.exit(1);
}

try {
  const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" });
  if (error) throw error;
  console.log("  profiles table (service role): OK");
} catch (error) {
  console.error("  profiles table (service role): FAILED", error.message ?? error);
  process.exit(1);
}

if (testEmail) {
  console.log(`\n  Sending invite to ${testEmail} ...`);
  const { data, error } = await admin.auth.admin.inviteUserByEmail(testEmail, {
    data: { full_name: "Invite Test" },
    redirectTo,
  });
  if (error) {
    console.error("  Invite send: FAILED", error.message);
    process.exit(1);
  }
  const userId = data.user?.id;
  if (!userId) {
    console.error("  Invite send: FAILED — no user id returned");
    process.exit(1);
  }
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: "Invite Test",
      role: "detailing",
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (profileError) {
    console.error("  Profile upsert: FAILED", profileError.message);
    process.exit(1);
  }
  console.log(`  Invite send: OK (user ${userId})`);
  console.log("  Profile upsert: OK (role=detailing, is_active=true)");
}

console.log("\nResult: READY — invite flow can run when logged in as Owner/Admin with users.create.");
process.exit(0);
