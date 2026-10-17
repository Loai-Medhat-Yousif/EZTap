import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Supabase client for Server Components, Route Handlers, and Server
 * Actions. Reads the admin session from request cookies and is subject
 * to Row Level Security — safe to use anywhere on the server, but it is
 * NOT privileged (see admin.ts for the service-role client).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render, where cookies can't
            // be written. Harmless as long as the session is also
            // refreshed from proxy.ts (added when auth lands in Stage 3).
          }
        },
      },
    },
  );
}
