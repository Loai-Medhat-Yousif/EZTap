import "server-only";

const DEFAULT_DOMAIN = "eztab.internal";

/**
 * Supabase Auth requires an email address; EZTab's login screen shows a
 * "Username" field instead (spec sections 22 and 47 — no unnecessary
 * complexity exposed to the admin). We deterministically map
 * username -> email by appending a fixed, non-secret domain suffix.
 *
 * The actual admin account is provisioned once, out-of-band, with
 * scripts/create-admin-user.mjs, which applies this exact same mapping
 * — so whatever username that script is given is exactly what gets
 * typed into the login form. Supabase Auth remains the sole source of
 * truth for the password; this function only decides *which* Supabase
 * user a given username refers to.
 */
export function usernameToAdminEmail(username: string): string {
  const domain = process.env.ADMIN_EMAIL_DOMAIN || DEFAULT_DOMAIN;
  return `${username.trim().toLowerCase()}@${domain}`;
}
