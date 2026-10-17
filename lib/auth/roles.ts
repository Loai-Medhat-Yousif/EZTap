/**
 * Admin identity is the `role: "admin"` claim in Supabase `app_metadata`
 * — writable only with the service role, never by the user themselves
 * (unlike `user_metadata`, which any signed-up user can set on their own
 * account). The same claim is what the database's `is_admin()` checks in
 * RLS, so the app-layer and DB-layer definitions of "admin" can't drift.
 *
 * Deliberately free of `server-only` so proxy.ts can import it too.
 */
export function isAdminUser(
  user: { app_metadata?: Record<string, unknown> } | null | undefined,
): boolean {
  return user?.app_metadata?.role === "admin";
}
