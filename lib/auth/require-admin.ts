import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth/roles";

/**
 * Every admin Server Action and admin Route Handler starts here.
 * Server Actions are plain public HTTP endpoints — being *reachable*
 * only from admin screens is a UI fact, not a security control — so each
 * one re-verifies the session itself. Row Level Security is a second,
 * independent layer behind this; neither is relied on alone.
 *
 * Uses getUser() (which asks Supabase to validate the token), never
 * getSession() (which only decodes whatever the cookie claims).
 */
export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) return null;
  return { supabase, user };
}
