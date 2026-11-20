"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/require-admin";
import {
  createCardSchema,
  profileDetailsSchema,
  targetUrlSchema,
  storeDetailsSchema,
  paymentDetailsSchema,
  menuDetailsSchema,
  menuCategorySchema,
  menuItemSchema,
  menuOfferSchema,
  profileLinkSchema,
  cardSaleSchema,
  cardThemeSchema,
  type CreateCardInput,
  type ProfileDetailsInput,
  type TargetUrlInput,
  type StoreDetailsInput,
  type PaymentDetailsInput,
  type MenuDetailsInput,
  type MenuCategoryInput,
  type MenuItemInput,
  type MenuOfferInput,
  type ProfileLinkInput,
  type CardSaleInput,
} from "@/lib/validation/cards";
import { isRedirectCardType } from "@/types";
import { isMenuPrintTemplateKind } from "@/lib/print/template";
import type { CardTheme } from "@/types";
import * as cardMutations from "@/lib/cards/mutations";
import { getCardEditUrl } from "@/lib/cards/urls";
import {
  generateEditToken,
  hashEditToken,
  type EditDuration,
} from "@/lib/cards/edit-links";
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

export type CardIdPreview = { cardId?: string; error?: string };

/**
 * Generates a candidate 6-digit card_id for the "Create Card" form to
 * display before the card is actually saved. Not itself a reservation
 * — createCard() below re-generates and retries on conflict, which is
 * where the real uniqueness guarantee lives (see the migration comment
 * on generate_unique_card_id()).
 *
 * Returns the usual `{ error }` shape rather than throwing so a hiccup
 * shows up as an inline message instead of an error boundary.
 */
export async function previewNewCardId(): Promise<CardIdPreview> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const { data, error } = await supabase.rpc("generate_unique_card_id");
  if (error || !data) {
    console.error("[cards action] Couldn't generate a card ID", error);
    return { error: "Couldn't generate a card ID. Try again." };
  }
  return { cardId: data };
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
  //
  // Only a GOOGLE_REVIEW card's target goes through Google's review-URL
  // normaliser; an InstaPay / Online Cash link is stored verbatim.
  let targetUrl: string | null = null;
  // Compared against each literal (rather than via isRedirectCardType)
  // so TypeScript narrows the discriminated union to the members that
  // actually carry a `targetUrl`.
  if (
    data.type === "GOOGLE_REVIEW" ||
    data.type === "INSTAPAY" ||
    data.type === "ONLINE_CASH"
  ) {
    targetUrl =
      data.type === "GOOGLE_REVIEW"
        ? await normalizeReviewUrl(data.targetUrl)
        : data.targetUrl;
  } else if (data.type === "STORE_PROFILE" && data.googleReviewUrl) {
    data.googleReviewUrl = await normalizeReviewUrl(data.googleReviewUrl);
  } else if (data.type === "MENU" && data.googleReviewUrl) {
    data.googleReviewUrl = await normalizeReviewUrl(data.googleReviewUrl);
  }

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
      .insert({
        card_id: generatedId,
        type: data.type,
        status: "INACTIVE" as const,
        target_url: targetUrl,
      })
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

  // A profile/store card owns a detail row. If that row can't be
  // created, roll the card back rather than leave a card whose
  // get_card_for_display() would render as inactive forever.
  const detailError =
    data.type === "PROFILE"
      ? (
          await supabase.from("profiles").insert({
            card_id: cardUuid,
            full_name: data.fullName,
            job_title: data.jobTitle ?? null,
            bio: data.bio ?? null,
            phone: data.phone ?? null,
            whatsapp: data.whatsapp ?? null,
            email: data.email ?? null,
            website: data.website ?? null,
            google_maps_url: data.googleMapsUrl ?? null,
          })
        ).error
      : data.type === "STORE_PROFILE"
        ? (
            await supabase.from("store_profiles").insert({
              card_id: cardUuid,
              full_name: data.fullName,
              category: data.category ?? null,
              bio: data.bio ?? null,
              phone: data.phone ?? null,
              whatsapp: data.whatsapp ?? null,
              email: data.email ?? null,
              website: data.website ?? null,
              google_maps_url: data.googleMapsUrl ?? null,
              address: data.address ?? null,
              opening_hours: data.openingHours ?? null,
              google_review_url: data.googleReviewUrl ?? null,
            })
          ).error
        : data.type === "MULTIPLE_PAYMENT_METHODS"
          ? (
              await supabase.from("payment_profiles").insert({
                card_id: cardUuid,
                full_name: data.fullName,
                bio: data.bio ?? null,
              })
            ).error
          : data.type === "MENU"
            ? (
                await supabase.from("menu_profiles").insert({
                  card_id: cardUuid,
                  full_name: data.fullName,
                  category: data.category ?? null,
                  bio: data.bio ?? null,
                  phone: data.phone ?? null,
                  whatsapp: data.whatsapp ?? null,
                  email: data.email ?? null,
                  website: data.website ?? null,
                  google_maps_url: data.googleMapsUrl ?? null,
                  address: data.address ?? null,
                  opening_hours: data.openingHours ?? null,
                  google_review_url: data.googleReviewUrl ?? null,
                })
              ).error
            : null;

  if (detailError) {
    await supabase.from("cards").delete().eq("id", cardUuid);
    return fail(
      data.type === "STORE_PROFILE"
        ? "Couldn't save the store. Try again."
        : data.type === "MULTIPLE_PAYMENT_METHODS"
          ? "Couldn't save the payment methods. Try again."
          : data.type === "MENU"
            ? "Couldn't save the menu. Try again."
            : "Couldn't save the profile. Try again.",
      detailError,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  redirect(`/admin/cards/${cardId}`);
}

export async function setCardStatus(
  cardId: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<ActionResult> {
  // Server Actions are public HTTP endpoints — the type annotation is
  // erased at runtime, so the status is re-checked here like every
  // other action re-validates its input before touching the database.
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { error: "Invalid card status." };
  }
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

/**
 * Sets the accent theme of a card's public page. Re-checks the card type
 * here (Server Actions are public HTTP endpoints), so a redirect card
 * can't be given a theme it would never show.
 */
export async function updateCardTheme(
  cardId: string,
  theme: CardTheme,
): Promise<ActionResult> {
  const parsed = cardThemeSchema.safeParse(theme);
  if (!parsed.success) return { error: "Invalid theme." };

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.saveCardTheme(
    supabase,
    cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
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

/**
 * Saves the target URL of a "scan -> redirect" card (Google Review,
 * InstaPay, Online Cash). A Google Review target is normalised to the
 * writereview URL; the payment types are stored as typed.
 */
export async function updateTargetUrl(
  cardId: string,
  input: TargetUrlInput,
): Promise<ActionResult> {
  const parsed = targetUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid URL." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, type")
    .eq("card_id", cardId)
    .maybeSingle();

  if (cardError || !card) return { error: "Card not found." };
  if (!isRedirectCardType(card.type)) {
    return { error: "This card doesn't take a link." };
  }

  const targetUrl =
    card.type === "GOOGLE_REVIEW"
      ? await normalizeReviewUrl(parsed.data.targetUrl)
      : parsed.data.targetUrl;

  const { error } = await supabase
    .from("cards")
    .update({ target_url: targetUrl })
    .eq("id", card.id);

  if (error) return fail("Couldn't save the URL.", error);

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/cards");
  return {};
}

// --- Store details ----------------------------------------------------

export async function updateStoreDetails(
  cardId: string,
  input: StoreDetailsInput,
): Promise<ActionResult> {
  const parsed = storeDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const data = parsed.data;
  if (data.googleReviewUrl) {
    data.googleReviewUrl = await normalizeReviewUrl(data.googleReviewUrl);
  }

  const result = await cardMutations.saveStoreDetails(supabase, cardUuid, data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  return {};
}

// --- Multiple payment methods -----------------------------------------

export async function updatePaymentDetails(
  cardId: string,
  input: PaymentDetailsInput,
): Promise<ActionResult> {
  const parsed = paymentDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.savePaymentDetails(supabase, cardUuid, parsed.data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  return {};
}

// --- Menu print design ------------------------------------------------

/** Admin-only: select which of the two MENU print designs a card uses. */
export async function updateMenuPrintTemplate(
  cardId: string,
  templateKind: string,
): Promise<ActionResult> {
  if (!isMenuPrintTemplateKind(templateKind)) {
    return { error: "Choose one of the two menu designs." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.saveMenuPrintTemplate(
    supabase,
    cardUuid,
    templateKind,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/cards");
  revalidatePath(`/api/admin/cards/${cardId}/print`);
  return {};
}

// --- Menu details ----------------------------------------------------

export async function updateMenuDetails(
  cardId: string,
  input: MenuDetailsInput,
): Promise<ActionResult> {
  const parsed = menuDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const data = parsed.data;
  if (data.googleReviewUrl) {
    data.googleReviewUrl = await normalizeReviewUrl(data.googleReviewUrl);
  }

  const result = await cardMutations.saveMenuDetails(supabase, cardUuid, data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/cards");
  return {};
}

/**
 * Turns a pasted Google Maps link into a direct "write a review" URL.
 * Shared by the Tools page and the card/store editors' review-URL field.
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
 * Mints a one-time-visible edit link for a PROFILE, STORE_PROFILE,
 * MULTIPLE_PAYMENT_METHODS or MENU card.
 * Only the hash is stored, so the returned URL is the only place the raw
 * token ever exists. Any previously-active link for the card is revoked
 * in the same breath, so exactly one window is ever open per card.
 */
export async function createCardEditLink(
  cardId: string,
  duration: EditDuration = "forever",
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
  if (
    card.type !== "PROFILE" &&
    card.type !== "STORE_PROFILE" &&
    card.type !== "MULTIPLE_PAYMENT_METHODS" &&
    card.type !== "MENU"
  ) {
    return { error: "Edit links aren't available for this card type." };
  }

  const nowIso = new Date().toISOString();
  const { error: revokeError } = await supabase
    .from("card_edit_links")
    .update({ revoked_at: nowIso })
    .eq("card_id", card.id)
    .is("closed_at", null)
    .is("revoked_at", null);

  if (revokeError) return fail("Couldn't create the edit link.", revokeError);

  const token = generateEditToken(duration);
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

/**
 * Saves a whole new link order at once. The links manager reorders
 * locally (drag and drop) and calls this once when the admin presses
 * Save, rather than issuing a request per arrow click.
 */
export async function reorderProfileLinks(
  cardId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.reorderProfileLinks(
    supabase,
    cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

// --- Store links -----------------------------------------------------
// Same validation and revalidation as the profile-link actions above;
// they just target the store_links table.

export async function addStoreLink(
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

  const result = await cardMutations.insertStoreLink(supabase, cardUuid, parsed.data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function updateStoreLink(
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

  const result = await cardMutations.updateStoreLink(
    supabase,
    cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function deleteStoreLink(
  cardId: string,
  linkId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.deleteStoreLink(supabase, cardUuid, linkId);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

export async function setStoreLinkActive(
  cardId: string,
  linkId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.setStoreLinkActive(
    supabase,
    cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

/** Saves a whole new store-link order at once — see reorderProfileLinks. */
export async function reorderStoreLinks(
  cardId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.reorderStoreLinks(
    supabase,
    cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  return {};
}

// --- Payment links ---------------------------------------------------
// Same validation and revalidation as the profile/store-link actions;
// they write to payment_links.

export async function addPaymentLink(
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

  const result = await cardMutations.insertPaymentLink(supabase, cardUuid, parsed.data);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function updatePaymentLink(
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

  const result = await cardMutations.updatePaymentLink(
    supabase,
    cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function deletePaymentLink(
  cardId: string,
  linkId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.deletePaymentLink(supabase, cardUuid, linkId);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function setPaymentLinkActive(
  cardId: string,
  linkId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.setPaymentLinkActive(
    supabase,
    cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

/** Saves a whole new payment-link order at once — see reorderProfileLinks. */
export async function reorderPaymentLinks(
  cardId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result = await cardMutations.reorderPaymentLinks(
    supabase,
    cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

// --- Image (profile / store / payment / menu photo) ------------------

export async function uploadProfileImageAction(
  cardId: string,
  formData: FormData,
): Promise<ActionResult> {
  return uploadImage(cardId, formData, "profile");
}

export async function uploadStoreImageAction(
  cardId: string,
  formData: FormData,
): Promise<ActionResult> {
  return uploadImage(cardId, formData, "store");
}

/** Uploads the photo/logo on a multiple-payment-methods card. Exported
 * under the shared `uploadProfileImageAction` name by the editor bundle,
 * so `ProfileImageUpload` works unchanged. */
export async function uploadPaymentImageAction(
  cardId: string,
  formData: FormData,
): Promise<ActionResult> {
  return uploadImage(cardId, formData, "payment");
}

export async function uploadMenuImageAction(
  cardId: string,
  formData: FormData,
): Promise<ActionResult> {
  return uploadImage(cardId, formData, "menu");
}

async function uploadImage(
  cardId: string,
  formData: FormData,
  kind: "profile" | "store" | "payment" | "menu",
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

  const result =
    kind === "store"
      ? await cardMutations.saveStoreImage(supabase, cardUuid, file)
      : kind === "payment"
        ? await cardMutations.savePaymentImage(supabase, cardUuid, file)
        : kind === "menu"
          ? await cardMutations.saveMenuImage(supabase, cardUuid, file)
          : await cardMutations.saveProfileImage(supabase, cardUuid, file);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function removeProfileImageAction(
  cardId: string,
): Promise<ActionResult> {
  return removeImage(cardId, "profile");
}

export async function removeStoreImageAction(
  cardId: string,
): Promise<ActionResult> {
  return removeImage(cardId, "store");
}

export async function removePaymentImageAction(
  cardId: string,
): Promise<ActionResult> {
  return removeImage(cardId, "payment");
}

export async function removeMenuImageAction(
  cardId: string,
): Promise<ActionResult> {
  return removeImage(cardId, "menu");
}

async function removeImage(
  cardId: string,
  kind: "profile" | "store" | "payment" | "menu",
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };

  const result =
    kind === "store"
      ? await cardMutations.removeStoreImage(supabase, cardUuid)
      : kind === "payment"
        ? await cardMutations.removePaymentImage(supabase, cardUuid)
        : kind === "menu"
          ? await cardMutations.removeMenuImage(supabase, cardUuid)
          : await cardMutations.removeProfileImage(supabase, cardUuid);
  if (result.error) return result;

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

// --- Menu categories / items / offers --------------------------------

export async function addMenuCategory(
  cardId: string,
  input: MenuCategoryInput,
): Promise<ActionResult> {
  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.insertMenuCategory(supabase, cardUuid, parsed.data);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function updateMenuCategory(
  cardId: string,
  categoryId: string,
  input: MenuCategoryInput,
): Promise<ActionResult> {
  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.updateMenuCategory(supabase, cardUuid, categoryId, parsed.data);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function deleteMenuCategory(
  cardId: string,
  categoryId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.deleteMenuCategory(supabase, cardUuid, categoryId);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function reorderMenuCategories(
  cardId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.reorderMenuCategories(supabase, cardUuid, orderedIds);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function addMenuItem(
  cardId: string,
  input: MenuItemInput,
): Promise<ActionResult> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.insertMenuItem(supabase, cardUuid, parsed.data);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function updateMenuItem(
  cardId: string,
  itemId: string,
  input: MenuItemInput,
): Promise<ActionResult> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.updateMenuItem(supabase, cardUuid, itemId, parsed.data);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function deleteMenuItem(
  cardId: string,
  itemId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.deleteMenuItem(supabase, cardUuid, itemId);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function reorderMenuItems(
  cardId: string,
  categoryId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.reorderMenuItems(supabase, cardUuid, categoryId, orderedIds);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function uploadMenuItemImageAction(
  cardId: string,
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const result = await cardMutations.saveMenuItemImage(supabase, cardUuid, itemId, file);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function removeMenuItemImageAction(
  cardId: string,
  itemId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.removeMenuItemImage(supabase, cardUuid, itemId);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function addMenuOffer(
  cardId: string,
  input: MenuOfferInput,
): Promise<ActionResult> {
  const parsed = menuOfferSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.insertMenuOffer(supabase, cardUuid, parsed.data);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function updateMenuOffer(
  cardId: string,
  offerId: string,
  input: MenuOfferInput,
): Promise<ActionResult> {
  const parsed = menuOfferSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.updateMenuOffer(supabase, cardUuid, offerId, parsed.data);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function deleteMenuOffer(
  cardId: string,
  offerId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.deleteMenuOffer(supabase, cardUuid, offerId);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function reorderMenuOffers(
  cardId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.reorderMenuOffers(supabase, cardUuid, orderedIds);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function uploadMenuOfferImageAction(
  cardId: string,
  offerId: string,
  formData: FormData,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const result = await cardMutations.saveMenuOfferImage(supabase, cardUuid, offerId, file);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
  return {};
}

export async function removeMenuOfferImageAction(
  cardId: string,
  offerId: string,
): Promise<ActionResult> {
  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;
  const cardUuid = await resolveCardUuid(supabase, cardId);
  if (!cardUuid) return { error: "Card not found." };
  const result = await cardMutations.removeMenuOfferImage(supabase, cardUuid, offerId);
  if (result.error) return result;
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/card/${cardId}`);
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
