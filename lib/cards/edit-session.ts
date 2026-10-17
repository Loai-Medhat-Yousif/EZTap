import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCardDetailByUuid, type CardDetail } from "@/lib/data/cards";
import { hashEditToken, editLinkExpiresAt } from "@/lib/cards/edit-links";

export type EditSessionCard = Extract<CardDetail, { type: "PROFILE" }>;

export type EditSession =
  | { error: string }
  | { supabase: SupabaseClient<Database>; cardUuid: string };

/**
 * Validates a raw edit token and returns a service-role client scoped to
 * its card. This runs before every customer edit action and is the only
 * authorization the customer side has — the token *is* the credential.
 * A token with no `expires_at` yet (created but never opened) is opened
 * here, so the 30-minute window starts on first use.
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

  if (!expiresAt) {
    expiresAt = editLinkExpiresAt(now);
    await supabase
      .from("card_edit_links")
      .update({
        opened_at: link.opened_at ?? now.toISOString(),
        expires_at: expiresAt,
      })
      .eq("token_hash", tokenHash);
  } else if (new Date(expiresAt).getTime() <= now.getTime()) {
    return { error: "This edit link has expired." };
  }

  return { supabase, cardUuid: link.card_id };
}

export type OpenEditSessionResult =
  | { status: "invalid" }
  | { status: "closed" }
  | { status: "expired" }
  | { status: "open"; card: EditSessionCard; expiresAt: string };

/**
 * Reads (and, on first view, starts) an edit session for the page
 * render. Distinct from resolveEditSession() only in that it returns a
 * status for the UI rather than an action-scoped client.
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

  if (!expiresAt) {
    expiresAt = editLinkExpiresAt(now);
    const { error } = await supabase
      .from("card_edit_links")
      .update({
        opened_at: link.opened_at ?? now.toISOString(),
        expires_at: expiresAt,
      })
      .eq("id", link.id);
    if (error) return { status: "invalid" };
  } else if (new Date(expiresAt).getTime() <= now.getTime()) {
    return { status: "expired" };
  }

  const card = await getCardDetailByUuid(supabase, link.card_id);
  if (!card || card.type !== "PROFILE") return { status: "invalid" };

  return { status: "open", card, expiresAt };
}

/** Ends the window early — the customer's "save and close". Idempotent:
 * an already-closed or expired link still reports success to the caller,
 * since the end state is the same. */
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
