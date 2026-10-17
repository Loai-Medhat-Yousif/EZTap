/**
 * Best-effort client IP for rate limiting. On Vercel the platform sets
 * x-forwarded-for itself (overwriting anything the client sent), so its
 * first entry is the real client address; elsewhere it can be spoofed,
 * which only ever weakens rate limiting, never anything that guards data.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
