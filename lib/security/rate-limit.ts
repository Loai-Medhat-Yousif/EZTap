import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keys are HMAC-hashed before they touch the database, so the
 * rate_limits table never holds a raw IP address — and, being keyed
 * with a server secret, the hashes can't be reversed by brute-forcing
 * the (small) IPv4 space. Rows expire after at most an hour.
 */
export function hashIdentifier(value: string): string {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(value)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Returns true if this hit is within the limit. Fails OPEN if the
 * limiter itself errors (logged loudly): a Supabase blip shouldn't lock
 * the admin out of logging in or silently break card views — and every
 * data-protecting control (RLS, is_admin) is independent of this one.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] check failed, allowing request:", error.message);
    return true;
  }
  return data === true;
}
