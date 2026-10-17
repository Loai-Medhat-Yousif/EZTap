import { cache } from "react";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PublicCardView } from "@/types";

/**
 * The single read path for the public /card/[cardId] route. Wrapped in
 * React's cache() so generateMetadata() and the page component — which
 * both need this — hit the database once per request, not twice.
 *
 * Uses the same server client as everywhere else in the app; for an
 * unauthenticated visitor it naturally resolves to the `anon` Postgres
 * role, which is exactly the access level get_card_for_display() was
 * built for (see supabase/migrations — it's SECURITY DEFINER and
 * granted to anon precisely so this works without any special-casing
 * here).
 */
export const getPublicCardView = cache(
  async (cardId: string): Promise<PublicCardView | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_card_for_display", {
      p_card_id: cardId,
    });

    if (error) throw error;

    // The function's return shape is documented and kept in sync with
    // PublicCardView in types/index.ts — see that type's own comment.
    return (data as PublicCardView | null) ?? null;
  },
);
