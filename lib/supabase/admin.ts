import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * The `server-only` import makes it a build error to reference this from
 * any Client Component. Use it strictly for privileged, server-only
 * operations that a normal admin session can't or shouldn't do directly —
 * e.g. checking 6-digit card_id uniqueness across the whole table during
 * generation, or deleting an orphaned storage object.
 *
 * NEVER pass this client's queries or results straight to the browser
 * without going through your own authorization check first.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
