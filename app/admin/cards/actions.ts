"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/require-admin";
import {
  createCardSchema,
  profileDetailsSchema,
  googleReviewDetailsSchema,
  profileLinkSchema,
  cardSaleSchema,
  type CreateCardInput,
  type ProfileDetailsInput,
  type GoogleReviewDetailsInput,
  type ProfileLinkInput,
  type CardSaleInput,
} from "@/lib/validation/cards";
import * as cardMutations from "@/lib/cards/mutations";
import { getCardEditUrl } from "@/lib/cards/urls";
import { generateEditToken, hashEditToken } from "@/lib/cards/edit-links";
import { generateReviewLink } from "@/lib/google/review-link";

export type ActionResult = { error?: string };

const NOT_AUTHORIZED: ActionResult = { error: "Not authorized." };

/** Logs the real cause server-side (Vercel captures console.error) and
 * hands the client only a generic message — never a raw database error. */
function fail(message: string, cause: unknown): ActionResult {
  console.error(`[cards action] ${message}`, cause);
  return { error: message };
}

/**
 * Rewrites whatever the admin pasted into Google's canonical "write a
 * review" URL (`search.google.com/local/writereview?placeid=…`).
 *
 * Why this matters: Google only opens the *review dialog* for that exact
 * URL. A Maps share link, a `g.page/r/…/review` link, or a plain place
 * URL all resolve to the business's listing instead — so scanning the
 * card shows "the search and the place" rather than the dialog, and
 * which one you get varies by device and whether the Maps app is
 * installed. Converting here means every printed QR leads to the
 * dialog.
 *
 * Anything that can't be converted (a non-Google review target, e.g. a
 * Facebook reviews page) is stored unchanged rather than rejected.
 */
async function normalizeReviewUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  const result = await generateReviewLink(trimmed);
  return result.url ?? trimmed;
}

async function resolveCardUuid(
  supabase: SupabaseClient<Database>,
  cardId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("cards")
    .select("id")
    .eq("card_id", cardId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Generates a candidate 6-digit card_id for the "Create Card" form to
 * display before the card is actually saved. Not itself a reservation
 * — createCard() below re-generates and retries on conflict, which is
 * where the real uniqueness guarantee lives (see the migration comment
 * on generate_unique_card_id()).
 */
export async function previewNewCardId(): Promise<string> {
  const context = await getAdminContext();
  if (!context) throw new Error("Not authorized");
  const { supabase } = context;
  const { data, error } = await supabase.rpc("generate_unique_card_id");
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to generate a card ID");
  }
  return data;
}

const MAX_CREATE_ATTEMPTS = 5;

export async function createCard(input: CreateCardInput): Promise<ActionResult> {
  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const data = parsed.data;
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  // Resolved once, outside the retry loop below — converting a Maps
  // link can mean following redirects, and that cost should not be
  // paid per attempt.
  const googleReviewUrl =
    data.type === "GOOGLE_REVIEW"
      ? await normalizeReviewUrl(data.googleReviewUrl)
      : null;

  let cardId: string | null = null;
  let cardUuid: string | null = null;

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const { data: generatedId, error: genError } = await supabase.rpc(
      "generate_unique_card_id",
    );
    if (genError || !generatedId) {
      return fail("Couldn't generate a card ID. Try again.", genError);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("cards")
      .insert(
        data.type === "GOOGLE_REVIEW"
          ? {
              card_id: generatedId,
              type: "GOOGLE_REVIEW" as const,
              google_review_url: googleReviewUrl,
              status: "INACTIVE" as const,
            }
          : {
              card_id: generatedId,
              type: "PROFILE" as const,
              status: "INACTIVE" as const,
            },
      )
      .select("id, card_id")
      .single();

    if (insertError) {
      // 23505 = unique_violation — another request took this exact
      // card_id in the gap between generating it and inserting it.
      // Vanishingly rare at this table's scale, but retried rather
      // than assumed away; see the generator function's own comment.
      if (insertError.code === "23505") continue;
      return fail("Couldn't create the card. Try again.", insertError);
    }

    cardId = inserted.card_id;
    cardUuid = inserted.id;
    break;
  }

  if (!cardId || !cardUuid) {
    return { error: "Couldn't find a free card ID. Try again." };
  }

  if (data.type === "PROFILE") {
    const { error: profileError } = await supabase.from("profiles").insert({
      card_id: cardUuid,
      full_name: data.fullName,
      job_title: data.jobTitle ?? null,
      bio: data.bio ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      google_maps_url: data.googleMapsUrl ?? null,
    });

    if (profileError) {
      // Don't leave a PROFILE-type card with no profile row behind —
      // get_card_for_display() treats that combination as inactive
      // rather than broken, but there's no reason to leave the
      // orphaned card around when the very next thing the admin will
      // do is retry.
      await supabase.from("cards").delete().eq("id", cardUuid);
      return fail("Couldn't save the profile. Try again.", profileError);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  redirect(`/admin/cards/${cardId}`);
}

export async function setCardStatus(
  cardId: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const { error } = await supabase
    .from("cards")
    .update({ status })
    .eq("card_id", cardId);

  if (error) return fail("Couldn't update the card's status.", error);

  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

/** Records (or clears) a sale: the EGP price and the date, which feed
 * the Statistics page. Marking a card sold stamps "now" once and keeps
 * that date on later price edits; un-selling clears both. */
export async function updateCardSale(
  cardId: string,
  input: CardSaleInput,
): Promise<ActionResult> {
  const parsed = cardSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the sale fields." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, sold_at")
    .eq("card_id", cardId)
    .maybeSingle();

  if (cardError || !card) return { error: "Card not found." };

  const patch = parsed.data.sold
    ? {
        sold_at: card.sold_at ?? new Date().toISOString(),
        price_egp: parsed.data.priceEgp,
      }
    : { sold_at: null, price_egp: null };

  const { error } = await supabase.from("cards").update(patch).eq("id", card.id);
  if (error) return fail("Couldn't save the sale.", error);

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/statistics");
  return {};
}

export async function updateProfileDetails(
  cardId: string,
  input: ProfileDetailsInput,
): Promise<ActionResult> {
  const parsed = profileDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.saveProfileDetails(supabase, cardUuid, parsed.data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  return {};
}

export async function updateGoogleReviewUrl(
  cardId: string,
  input: GoogleReviewDetailsInput,
): Promise<ActionResult> {
  const parsed = googleReviewDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid URL." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const { error } = await supabase
    .from("cards")
    .update({
      google_review_url: await normalizeReviewUrl(parsed.data.googleReviewUrl),
    })
    .eq("card_id", cardId)
    .eq("type", "GOOGLE_REVIEW");

  if (error) return fail("Couldn't save the URL.", error);

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/cards");
  return {};
}

/**
 * Turns a pasted Google Maps link into a direct "write a review" URL.
 * Shared by the Tools page and the card editor's review-URL field.
 */
export async function generateReviewLinkAction(
  mapsUrl: string,
): Promise<{ url?: string; error?: string }> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };

  const result = await generateReviewLink(mapsUrl);
  if (result.error) return { error: result.error };
  return { url: result.url };
}

// --- Temporary customer edit links -----------------------------------

/**
 * Mints a one-time-visible edit link for a PROFILE card. Only the hash
 * is stored, so the returned URL is the only place the raw token ever
 * exists. Any previously-active link for the card is revoked in the same
 * breath, so exactly one window is ever open per card.
 */
export async function createCardEditLink(
  cardId: string,
): Promise<{ url?: string; error?: string }> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, type")
    .eq("card_id", cardId)
    .maybeSingle();

  if (cardError || !card) return { error: "Card not found." };
  if (card.type !== "PROFILE") {
    return { error: "Edit links are only available for profile cards." };
  }

  const nowIso = new Date().toISOString();
  const { error: revokeError } = await supabase
    .from("card_edit_links")
    .update({ revoked_at: nowIso })
    .eq("card_id", card.id)
    .is("closed_at", null)
    .is("revoked_at", null);

  if (revokeError) return fail("Couldn't create the edit link.", revokeError);

  const token = generateEditToken();
  const { error } = await supabase.from("card_edit_links").insert({
    card_id: card.id,
    token_hash: hashEditToken(token),
  });

  if (error) return fail("Couldn't create the edit link.", error);

  revalidatePath(`/admin/cards/${cardId}`);
  return { url: getCardEditUrl(token) };
}

/** Ends the currently-open edit window early (admin-side "close"). */
export async function closeCardEditLink(cardId: string): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("card_edit_links")
    .update({ closed_at: nowIso })
    .eq("card_id", cardUuid)
    .is("closed_at", null)
    .is("revoked_at", null);

  if (error) return fail("Couldn't close the edit link.", error);

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

// --- Profile links ---------------------------------------------------

export async function addProfileLink(
  cardId: string,
  input: ProfileLinkInput,
): Promise<ActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.insertProfileLink(supabase, cardUuid, parsed.data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function updateProfileLink(
  cardId: string,
  linkId: string,
  input: ProfileLinkInput,
): Promise<ActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.updateProfileLink(
    supabase,
    cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function deleteProfileLink(
  cardId: string,
  linkId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.deleteProfileLink(supabase, cardUuid, linkId);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function setProfileLinkActive(
  cardId: string,
  linkId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.setProfileLinkActive(
    supabase,
    cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function moveProfileLink(
  cardId: string,
  linkId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.moveProfileLink(
    supabase,
    cardUuid,
    linkId,
    direction,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

// --- Profile image -----------------------------------------------------

export async function uploadProfileImageAction(
  cardId: string,
  formData: FormData,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.saveProfileImage(supabase, cardUuid, file);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function removeProfileImageAction(
  cardId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.removeProfileImage(supabase, cardUuid);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function deleteCard(cardId: string): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const { error } = await supabase.from("cards").delete().eq("card_id", cardId);
  if (error) return fail("Couldn't delete the card.", error);

  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  redirect("/admin/cards");
}
