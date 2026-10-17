import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EditLinkStatus = "none" | "pending" | "active" | "expired";

export type EditLinkState = {
  status: EditLinkStatus;
  expiresAt: string | null;
};

/**
 * The state of a card's current (non-closed, non-revoked) edit link, for
 * the admin panel. "pending" means the link exists but the customer
 * hasn't opened it yet (so the 30-minute clock hasn't started).
 */
export async function getActiveEditLinkState(
  cardUuid: string,
): Promise<EditLinkState> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("card_edit_links")
    .select("expires_at")
    .eq("card_id", cardUuid)
    .is("closed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { status: "none", expiresAt: null };
  if (!data.expires_at) return { status: "pending", expiresAt: null };
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return { status: "expired", expiresAt: data.expires_at };
  }
  return { status: "active", expiresAt: data.expires_at };
}
