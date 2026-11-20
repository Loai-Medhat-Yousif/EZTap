import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCardDetailByUuid, type CardDetail } from "@/lib/data/cards";
import { hashEditToken, parseEditToken, editLinkExpiresAt } from "@/lib/cards/edit-links";

export type EditSessionCard = Extract<
  CardDetail,
  { type: "PROFILE" | "STORE_PROFILE" | "MULTIPLE_PAYMENT_METHODS" | "MENU" }
>;

export type EditSession =
  | { error: string }
  | { supabase: SupabaseClient<Database>; cardUuid: string };

/**
 * Validates a raw edit token and returns a service-role client scoped to
 * its card. This runs before every customer edit action.
 */
export async function resolveEditSession(token: string): Promise<EditSession> {
  const supabase = createAdminClient();
  const tokenHash = hashEditToken(token);

  const { data: link } = await supabase
    .from("card_edit_links")
    .select("card_id, opened_at, expires_at, closed_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!link) return { error: "This edit link isn't valid." };
  if (link.closed_at) return { error: "This edit link has already been closed." };
  if (link.revoked_at) {
    return { error: "This edit link is no longer active." };
  }

  const now = new Date();
  let expiresAt = link.expires_at;

  if (!link.opened_at) {
    const { duration } = parseEditToken(token);
    expiresAt = editLinkExpiresAt(now, duration);
    await supabase
      .from("card_edit_links")
      .update({
        opened_at: now.toISOString(),
        expires_at: expiresAt,
      })
      .eq("token_hash", tokenHash);
  } else if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    return { error: "This edit link has expired." };
  }

  return { supabase, cardUuid: link.card_id };
}

export type OpenEditSessionResult =
  | { status: "invalid" }
  | { status: "closed" }
  | { status: "expired" }
  | { status: "open"; card: EditSessionCard; expiresAt: string | null };

/**
 * Reads (and, on first view, records opened_at and calculates expires_at if applicable)
 * an edit session for the page render.
 */
export async function openEditSession(
  token: string,
): Promise<OpenEditSessionResult> {
  const supabase = createAdminClient();
  const tokenHash = hashEditToken(token);

  const { data: link } = await supabase
    .from("card_edit_links")
    .select("id, card_id, opened_at, expires_at, closed_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!link) return { status: "invalid" };
  if (link.closed_at || link.revoked_at) return { status: "closed" };

  const now = new Date();
  let expiresAt = link.expires_at;

  if (!link.opened_at) {
    const { duration } = parseEditToken(token);
    expiresAt = editLinkExpiresAt(now, duration);
    const { error } = await supabase
      .from("card_edit_links")
      .update({
        opened_at: now.toISOString(),
        expires_at: expiresAt,
      })
      .eq("id", link.id);
    if (error) return { status: "invalid" };
  } else if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    return { status: "expired" };
  }

  const card = await getCardDetailByUuid(supabase, link.card_id);
  if (!card) return { status: "invalid" };
  if (
    card.type !== "PROFILE" &&
    card.type !== "STORE_PROFILE" &&
    card.type !== "MULTIPLE_PAYMENT_METHODS" &&
    card.type !== "MENU"
  ) {
    return { status: "invalid" };
  }

  return { status: "open", card, expiresAt };
}

/** Ends the window early — the customer's "save and close". */
export async function closeEditSession(token: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const tokenHash = hashEditToken(token);

  const { data: link } = await supabase
    .from("card_edit_links")
    .select("id, closed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!link) return { error: "This edit link isn't valid." };
  if (link.closed_at) return {};

  // If the link has "forever" duration, keep it open — just save any
  // changes and let the user re-access the link later. For temporary
  // durations (1 day / 1 hour / 30 min), close the link as usual.
  const { duration } = parseEditToken(token);
  if (duration === "forever") return {};

  const { error } = await supabase
    .from("card_edit_links")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", link.id);

  if (error) {
    console.error("[edit session] close", error);
    return { error: "Couldn't close the edit session." };
  }
  return {};
}
