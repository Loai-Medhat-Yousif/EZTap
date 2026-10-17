#!/usr/bin/env node
/**
 * One-time setup script: creates the single EZTab admin account in
 * Supabase Auth. There is no registration UI (spec section 22 — no
 * multi-admin, no public sign-up), so this is the only way an admin
 * account ever gets created. Run it once per environment (local,
 * staging, production) after applying the migrations in supabase/.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   ADMIN_EMAIL_DOMAIN=eztab.internal \
 *   node scripts/create-admin-user.mjs <username> <password>
 *
 * The username you pass here is exactly what gets typed into the
 * EZTab login screen — see lib/auth/admin-email.ts for the mapping.
 */
import { createClient } from "@supabase/supabase-js";

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error(
    "Usage: node scripts/create-admin-user.mjs <username> <password>",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.ADMIN_EMAIL_DOMAIN || "eztab.internal";

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(1);
}

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const email = `${username.trim().toLowerCase()}@${domain}`;

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // no inbox exists for this internal address
  // What makes this account THE admin. app_metadata can only be written
  // with the service role (as here) — a user can edit their own
  // user_metadata but never this — and it's exactly the claim the
  // database's is_admin() and the app's isAdminUser() both check.
  app_metadata: { role: "admin" },
});

if (error) {
  console.error(`Failed to create admin user: ${error.message}`);
  process.exit(1);
}

console.log("Admin user created.");
console.log(`  Sign in with username: ${username}`);
console.log(`  (mapped to Supabase Auth email: ${email})`);
console.log(`  User id: ${data.user.id}`);
