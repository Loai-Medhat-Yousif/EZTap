import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CardTheme } from "@/types";
import type { MenuPrintTemplateKind } from "@/lib/print/template";
import {
  uploadMenuImage,
  uploadProfileImage,
  deleteMenuImage,
  deleteProfileImage,
} from "@/lib/storage/profile-images";
import type {
  MenuCategoryInput,
  MenuDetailsInput,
  MenuItemInput,
  MenuOfferInput,
  PaymentDetailsInput,
  ProfileDetailsInput,
  ProfileLinkInput,
  StoreDetailsInput,
} from "@/lib/validation/cards";

export type MutationResult = { error?: string };

/**
 * The actual card/profile/link writes, shared by the admin actions and
 * the temporary customer edit-link actions. Both callers supply a
 * Supabase client and the card's *internal* UUID; they differ only in
 * how they authorized the caller and which client they pass (admin
 * session vs. service role scoped to one token). Keeping the writes here
 * means the two paths can never drift apart.
 *
 * Every link mutation re-resolves the profile from `cardUuid` and
 * filters on it, so a caller that only knows a card (or a token that
 * maps to one card) can never touch another card's links even by
 * forging a link id.
 */

async function getProfileId(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<string | null> {
  const { data: card } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (!card || card.type !== "PROFILE") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("card_id", cardUuid)
    .maybeSingle();

  return profile?.id ?? null;
}

export async function saveProfileDetails(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: ProfileDetailsInput,
): Promise<MutationResult> {
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (cardError || !card || card.type !== "PROFILE") {
    return { error: "Card not found." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      job_title: data.jobTitle ?? null,
      bio: data.bio ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      google_maps_url: data.googleMapsUrl ?? null,
    })
    .eq("card_id", cardUuid);

  if (error) {
    console.error("[card mutation] save profile", error);
    return { error: "Couldn't save the profile." };
  }
  return {};
}

/**
 * Sets the accent theme of a card's public page. Only page cards
 * (PROFILE / STORE_PROFILE / MULTIPLE_PAYMENT_METHODS) have anything to
 * theme; redirect cards are rejected here as well as in the Server
 * Actions, so no path can write a theme that will never be displayed.
 */
export async function saveCardTheme(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  theme: CardTheme,
): Promise<MutationResult> {
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (cardError || !card) return { error: "Card not found." };
  if (
    card.type !== "PROFILE" &&
    card.type !== "STORE_PROFILE" &&
    card.type !== "MULTIPLE_PAYMENT_METHODS" &&
    card.type !== "MENU"
  ) {
    return { error: "This card doesn't have a page to theme." };
  }

  const { error } = await supabase
    .from("cards")
    .update({ theme })
    .eq("id", cardUuid);

  if (error) {
    console.error("[card mutation] save theme", error);
    return { error: "Couldn't save the theme." };
  }
  return {};
}

export async function saveProfileImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  file: File,
): Promise<MutationResult> {
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (cardError || !card || card.type !== "PROFILE") {
    return { error: "Card not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_image_path")
    .eq("card_id", cardUuid)
    .maybeSingle();
  const previousPath = profile?.profile_image_path ?? null;

  let uploaded;
  try {
    uploaded = await uploadProfileImage(supabase, cardUuid, file);
  } catch (error) {
    console.error("[card mutation] upload photo", error);
    return { error: "Couldn't upload the photo." };
  }
  if ("error" in uploaded) {
    return {
      error:
        uploaded.error === "type"
          ? "Use a JPEG, PNG, or WebP image."
          : "Image must be 5MB or smaller.",
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ profile_image_path: uploaded.path })
    .eq("card_id", cardUuid);

  if (updateError) {
    // The row didn't take the new path, so the file we just stored is
    // unreferenced — remove it rather than leave it orphaned.
    await deleteProfileImage(supabase, cardUuid, uploaded.path).catch(() => {});
    console.error("[card mutation] save photo path", updateError);
    return { error: "Couldn't save the photo." };
  }

  // Each upload gets a fresh, unique path (so the CDN can never serve a
  // stale copy of a replaced photo); the previous object is removed now
  // that nothing points at it. Best-effort: a failure here leaves one
  // stray file, never a broken profile.
  if (previousPath && previousPath !== uploaded.path) {
    await deleteProfileImage(supabase, cardUuid, previousPath).catch((error) =>
      console.error("[card mutation] couldn't remove replaced photo", error),
    );
  }

  return {};
}

export async function removeProfileImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<MutationResult> {
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (cardError || !card || card.type !== "PROFILE") {
    return { error: "Card not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_image_path")
    .eq("card_id", cardUuid)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ profile_image_path: null })
    .eq("card_id", cardUuid);

  if (updateError) {
    console.error("[card mutation] remove photo", updateError);
    return { error: "Couldn't remove the photo." };
  }

  if (profile?.profile_image_path) {
    await deleteProfileImage(supabase, cardUuid, profile.profile_image_path).catch(
      (error) => console.error("[card mutation] couldn't delete photo object", error),
    );
  }

  return {};
}

export async function insertProfileLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: ProfileLinkInput,
): Promise<MutationResult> {
  const profileId = await getProfileId(supabase, cardUuid);
  if (!profileId) return { error: "Card not found." };

  // New links go to the end of the list.
  const { count } = await supabase
    .from("profile_links")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId);

  const { error } = await supabase.from("profile_links").insert({
    profile_id: profileId,
    icon: data.icon,
    title: data.title,
    url: data.url,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("[card mutation] add link", error);
    return { error: "Couldn't add the link." };
  }
  return {};
}

export async function updateProfileLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  data: ProfileLinkInput,
): Promise<MutationResult> {
  const profileId = await getProfileId(supabase, cardUuid);
  if (!profileId) return { error: "Card not found." };

  const { error } = await supabase
    .from("profile_links")
    .update({ icon: data.icon, title: data.title, url: data.url })
    .eq("id", linkId)
    .eq("profile_id", profileId);

  if (error) {
    console.error("[card mutation] update link", error);
    return { error: "Couldn't save the link." };
  }
  return {};
}

export async function deleteProfileLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
): Promise<MutationResult> {
  const profileId = await getProfileId(supabase, cardUuid);
  if (!profileId) return { error: "Card not found." };

  const { error } = await supabase
    .from("profile_links")
    .delete()
    .eq("id", linkId)
    .eq("profile_id", profileId);

  if (error) {
    console.error("[card mutation] delete link", error);
    return { error: "Couldn't delete the link." };
  }
  return {};
}

export async function setProfileLinkActive(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  isActive: boolean,
): Promise<MutationResult> {
  const profileId = await getProfileId(supabase, cardUuid);
  if (!profileId) return { error: "Card not found." };

  const { error } = await supabase
    .from("profile_links")
    .update({ is_active: isActive })
    .eq("id", linkId)
    .eq("profile_id", profileId);

  if (error) {
    console.error("[card mutation] toggle link", error);
    return { error: "Couldn't update the link." };
  }
  return {};
}

/**
 * Resolves the order the client asked for against the ids the database
 * actually holds, and returns the order to write.
 *
 * Resolving first — rather than trusting the client's list — is what
 * makes a batch reorder safe from a stale tab: ids it sent that no
 * longer (or never) exist are dropped, and rows it has never seen, added
 * elsewhere meanwhile, keep their place at the end, which is also where
 * the server puts new links.
 */
function resolveLinkOrder(heldIds: string[], requestedIds: string[]): string[] {
  const held = new Set(heldIds);
  const requested = new Set(requestedIds);
  return [
    ...requestedIds.filter((id) => held.has(id)),
    ...heldIds.filter((id) => !requested.has(id)),
  ];
}

/** Reports the first failed write of a batch, or null if they all landed. */
function firstLinkWriteError(
  results: ReadonlyArray<{ error: unknown }>,
): MutationResult | null {
  const failed = results.find((result) => result.error);
  if (!failed) return null;
  console.error("[card mutation] reorder links", failed.error);
  return { error: "Couldn't reorder the links." };
}

/**
 * Persists a whole new link order in one pass, instead of one swap per
 * arrow click — the drag-and-drop UI assembles the final order locally
 * and sends it once.
 *
 * The queries are written out per table rather than parameterised on a
 * union of table names: the generated Supabase types only accept a
 * literal table name, so a shared helper can't be typed correctly here.
 */
export async function reorderProfileLinks(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  orderedIds: string[],
): Promise<MutationResult> {
  const profileId = await getProfileId(supabase, cardUuid);
  if (!profileId) return { error: "Card not found." };

  const { data: rows, error } = await supabase
    .from("profile_links")
    .select("id")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });

  if (error || !rows) {
    console.error("[card mutation] read links for reorder", error);
    return { error: "Couldn't reorder the links." };
  }

  const finalOrder = resolveLinkOrder(
    rows.map((row) => row.id),
    orderedIds,
  );

  // Already in this order — don't spend a write (or a revalidation) on it.
  if (finalOrder.every((id, index) => rows[index]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase
        .from("profile_links")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("profile_id", profileId),
    ),
  );

  return firstLinkWriteError(results) ?? {};
}

// =====================================================================
// Store profile (a STORE_PROFILE card's own data + links)
// =====================================================================
// Mirrors the profile mutations above one-for-one, against store_profiles
// / store_links instead of profiles / profile_links. Reuses the shared
// `profile-images` bucket for the store logo.

async function getStoreProfileId(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<string | null> {
  const { data: card } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (!card || card.type !== "STORE_PROFILE") return null;

  const { data: store } = await supabase
    .from("store_profiles")
    .select("id")
    .eq("card_id", cardUuid)
    .maybeSingle();

  return store?.id ?? null;
}

export async function saveStoreDetails(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: StoreDetailsInput,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { error } = await supabase
    .from("store_profiles")
    .update({
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
    .eq("id", storeId);

  if (error) {
    console.error("[card mutation] save store", error);
    return { error: "Couldn't save the store." };
  }
  return {};
}

export async function saveStoreImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  file: File,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  let uploaded;
  try {
    uploaded = await uploadProfileImage(supabase, cardUuid, file);
  } catch (error) {
    console.error("[card mutation] upload store logo", error);
    return { error: "Couldn't upload the logo." };
  }
  if ("error" in uploaded) {
    return {
      error:
        uploaded.error === "type"
          ? "Use a JPEG, PNG, or WebP image."
          : "Image must be 5MB or smaller.",
    };
  }

  const { data: store } = await supabase
    .from("store_profiles")
    .select("store_image_path")
    .eq("id", storeId)
    .maybeSingle();
  const previousPath = store?.store_image_path ?? null;

  const { error: updateError } = await supabase
    .from("store_profiles")
    .update({ store_image_path: uploaded.path })
    .eq("id", storeId);

  if (updateError) {
    await deleteProfileImage(supabase, cardUuid, uploaded.path).catch(() => {});
    console.error("[card mutation] save store logo path", updateError);
    return { error: "Couldn't save the logo." };
  }

  if (previousPath && previousPath !== uploaded.path) {
    await deleteProfileImage(supabase, cardUuid, previousPath).catch((error) =>
      console.error("[card mutation] couldn't remove replaced logo", error),
    );
  }

  return {};
}

export async function removeStoreImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { data: store } = await supabase
    .from("store_profiles")
    .select("store_image_path")
    .eq("id", storeId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("store_profiles")
    .update({ store_image_path: null })
    .eq("id", storeId);

  if (updateError) {
    console.error("[card mutation] remove store logo", updateError);
    return { error: "Couldn't remove the logo." };
  }

  if (store?.store_image_path) {
    await deleteProfileImage(supabase, cardUuid, store.store_image_path).catch(
      (error) => console.error("[card mutation] couldn't delete logo object", error),
    );
  }

  return {};
}

export async function insertStoreLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: ProfileLinkInput,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { count } = await supabase
    .from("store_links")
    .select("*", { count: "exact", head: true })
    .eq("store_profile_id", storeId);

  const { error } = await supabase.from("store_links").insert({
    store_profile_id: storeId,
    icon: data.icon,
    title: data.title,
    url: data.url,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("[card mutation] add store link", error);
    return { error: "Couldn't add the link." };
  }
  return {};
}

export async function updateStoreLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  data: ProfileLinkInput,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { error } = await supabase
    .from("store_links")
    .update({ icon: data.icon, title: data.title, url: data.url })
    .eq("id", linkId)
    .eq("store_profile_id", storeId);

  if (error) {
    console.error("[card mutation] update store link", error);
    return { error: "Couldn't save the link." };
  }
  return {};
}

export async function deleteStoreLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { error } = await supabase
    .from("store_links")
    .delete()
    .eq("id", linkId)
    .eq("store_profile_id", storeId);

  if (error) {
    console.error("[card mutation] delete store link", error);
    return { error: "Couldn't delete the link." };
  }
  return {};
}

export async function setStoreLinkActive(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  isActive: boolean,
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { error } = await supabase
    .from("store_links")
    .update({ is_active: isActive })
    .eq("id", linkId)
    .eq("store_profile_id", storeId);

  if (error) {
    console.error("[card mutation] toggle store link", error);
    return { error: "Couldn't update the link." };
  }
  return {};
}

/** Persists a whole new link order at once — see reorderProfileLinks. */
export async function reorderStoreLinks(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  orderedIds: string[],
): Promise<MutationResult> {
  const storeId = await getStoreProfileId(supabase, cardUuid);
  if (!storeId) return { error: "Card not found." };

  const { data: rows, error } = await supabase
    .from("store_links")
    .select("id")
    .eq("store_profile_id", storeId)
    .order("sort_order", { ascending: true });

  if (error || !rows) {
    console.error("[card mutation] read store links for reorder", error);
    return { error: "Couldn't reorder the links." };
  }

  const finalOrder = resolveLinkOrder(
    rows.map((row) => row.id),
    orderedIds,
  );

  // Already in this order — don't spend a write (or a revalidation) on it.
  if (finalOrder.every((id, index) => rows[index]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase
        .from("store_links")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("store_profile_id", storeId),
    ),
  );

  return firstLinkWriteError(results) ?? {};
}

// =====================================================================
// Multiple payment methods (a MULTIPLE_PAYMENT_METHODS card's own data)
// =====================================================================
// Mirrors the store mutations one-for-one against payment_profiles /
// payment_links. Reuses the shared `profile-images` bucket for the photo.

async function getPaymentProfileId(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<string | null> {
  const { data: card } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (!card || card.type !== "MULTIPLE_PAYMENT_METHODS") return null;

  const { data: payment } = await supabase
    .from("payment_profiles")
    .select("id")
    .eq("card_id", cardUuid)
    .maybeSingle();

  return payment?.id ?? null;
}

export async function savePaymentDetails(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: PaymentDetailsInput,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { error } = await supabase
    .from("payment_profiles")
    .update({
      full_name: data.fullName,
      bio: data.bio ?? null,
    })
    .eq("id", paymentId);

  if (error) {
    console.error("[card mutation] save payment profile", error);
    return { error: "Couldn't save the payment details." };
  }
  return {};
}

export async function savePaymentImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  file: File,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  let uploaded;
  try {
    uploaded = await uploadProfileImage(supabase, cardUuid, file);
  } catch (error) {
    console.error("[card mutation] upload payment image", error);
    return { error: "Couldn't upload the image." };
  }
  if ("error" in uploaded) {
    return {
      error:
        uploaded.error === "type"
          ? "Use a JPEG, PNG, or WebP image."
          : "Image must be 5MB or smaller.",
    };
  }

  const { data: payment } = await supabase
    .from("payment_profiles")
    .select("payment_image_path")
    .eq("id", paymentId)
    .maybeSingle();
  const previousPath = payment?.payment_image_path ?? null;

  const { error: updateError } = await supabase
    .from("payment_profiles")
    .update({ payment_image_path: uploaded.path })
    .eq("id", paymentId);

  if (updateError) {
    await deleteProfileImage(supabase, cardUuid, uploaded.path).catch(() => {});
    console.error("[card mutation] save payment image path", updateError);
    return { error: "Couldn't save the image." };
  }

  if (previousPath && previousPath !== uploaded.path) {
    await deleteProfileImage(supabase, cardUuid, previousPath).catch((error) =>
      console.error("[card mutation] couldn't remove replaced payment image", error),
    );
  }

  return {};
}

export async function removePaymentImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { data: payment } = await supabase
    .from("payment_profiles")
    .select("payment_image_path")
    .eq("id", paymentId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("payment_profiles")
    .update({ payment_image_path: null })
    .eq("id", paymentId);

  if (updateError) {
    console.error("[card mutation] remove payment image", updateError);
    return { error: "Couldn't remove the image." };
  }

  if (payment?.payment_image_path) {
    await deleteProfileImage(supabase, cardUuid, payment.payment_image_path).catch(
      (error) => console.error("[card mutation] couldn't delete payment image object", error),
    );
  }

  return {};
}

export async function insertPaymentLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: ProfileLinkInput,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { count } = await supabase
    .from("payment_links")
    .select("*", { count: "exact", head: true })
    .eq("payment_profile_id", paymentId);

  const { error } = await supabase.from("payment_links").insert({
    payment_profile_id: paymentId,
    icon: data.icon,
    title: data.title,
    url: data.url,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("[card mutation] add payment link", error);
    return { error: "Couldn't add the link." };
  }
  return {};
}

export async function updatePaymentLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  data: ProfileLinkInput,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { error } = await supabase
    .from("payment_links")
    .update({ icon: data.icon, title: data.title, url: data.url })
    .eq("id", linkId)
    .eq("payment_profile_id", paymentId);

  if (error) {
    console.error("[card mutation] update payment link", error);
    return { error: "Couldn't save the link." };
  }
  return {};
}

export async function deletePaymentLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { error } = await supabase
    .from("payment_links")
    .delete()
    .eq("id", linkId)
    .eq("payment_profile_id", paymentId);

  if (error) {
    console.error("[card mutation] delete payment link", error);
    return { error: "Couldn't delete the link." };
  }
  return {};
}

export async function setPaymentLinkActive(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  isActive: boolean,
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { error } = await supabase
    .from("payment_links")
    .update({ is_active: isActive })
    .eq("id", linkId)
    .eq("payment_profile_id", paymentId);

  if (error) {
    console.error("[card mutation] toggle payment link", error);
    return { error: "Couldn't update the link." };
  }
  return {};
}

/** Persists a whole new link order at once — see reorderProfileLinks. */
export async function reorderPaymentLinks(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  orderedIds: string[],
): Promise<MutationResult> {
  const paymentId = await getPaymentProfileId(supabase, cardUuid);
  if (!paymentId) return { error: "Card not found." };

  const { data: rows, error } = await supabase
    .from("payment_links")
    .select("id")
    .eq("payment_profile_id", paymentId)
    .order("sort_order", { ascending: true });

  if (error || !rows) {
    console.error("[card mutation] read payment links for reorder", error);
    return { error: "Couldn't reorder the links." };
  }

  const finalOrder = resolveLinkOrder(
    rows.map((row) => row.id),
    orderedIds,
  );

  if (finalOrder.every((id, index) => rows[index]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase
        .from("payment_links")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("payment_profile_id", paymentId),
    ),
  );

  return firstLinkWriteError(results) ?? {};
}

// =====================================================================
// Menu (a MENU card's own data, categories, items, offers)
// =====================================================================
// Same ownership model as other page types: every mutation re-resolves the
// menu profile (and category/item/offer where relevant) from the card UUID
// so a caller can never touch another card's data.

async function getMenuProfileId(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<string | null> {
  const { data: card } = await supabase
    .from("cards")
    .select("id, type")
    .eq("id", cardUuid)
    .maybeSingle();

  if (!card || card.type !== "MENU") return null;

  const { data: menu } = await supabase
    .from("menu_profiles")
    .select("id")
    .eq("card_id", cardUuid)
    .maybeSingle();

  return menu?.id ?? null;
}

async function getOwnedMenuCategoryId(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  categoryId: string,
): Promise<string | null> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return null;
  const { data } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("menu_profile_id", menuId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function saveMenuDetails(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: MenuDetailsInput,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { error } = await supabase
    .from("menu_profiles")
    .update({
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
    .eq("id", menuId);

  if (error) {
    console.error("[card mutation] save menu", error);
    return { error: "Couldn't save the menu." };
  }
  return {};
}

/** Chooses one of the two MENU print designs for a specific menu card. */
export async function saveMenuPrintTemplate(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  templateKind: MenuPrintTemplateKind,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { error } = await supabase
    .from("menu_profiles")
    .update({ print_template_kind: templateKind })
    .eq("id", menuId);

  if (error) {
    console.error("[card mutation] save menu print template", error);
    return { error: "Couldn't save the menu design." };
  }
  return {};
}

export async function saveMenuImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  file: File,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  let uploaded;
  try {
    uploaded = await uploadProfileImage(supabase, cardUuid, file);
  } catch (error) {
    console.error("[card mutation] upload menu image", error);
    return { error: "Couldn't upload the image." };
  }
  if ("error" in uploaded) {
    return {
      error:
        uploaded.error === "type"
          ? "Use a JPEG, PNG, or WebP image."
          : "Image must be 5MB or smaller.",
    };
  }

  const { data: menu } = await supabase
    .from("menu_profiles")
    .select("menu_image_path")
    .eq("id", menuId)
    .maybeSingle();
  const previousPath = menu?.menu_image_path ?? null;

  const { error: updateError } = await supabase
    .from("menu_profiles")
    .update({ menu_image_path: uploaded.path })
    .eq("id", menuId);

  if (updateError) {
    await deleteProfileImage(supabase, cardUuid, uploaded.path).catch(() => {});
    console.error("[card mutation] save menu image path", updateError);
    return { error: "Couldn't save the image." };
  }

  if (previousPath && previousPath !== uploaded.path) {
    await deleteProfileImage(supabase, cardUuid, previousPath).catch((error) =>
      console.error("[card mutation] couldn't remove replaced menu image", error),
    );
  }

  return {};
}

export async function removeMenuImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { data: menu } = await supabase
    .from("menu_profiles")
    .select("menu_image_path")
    .eq("id", menuId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("menu_profiles")
    .update({ menu_image_path: null })
    .eq("id", menuId);

  if (updateError) {
    console.error("[card mutation] remove menu image", updateError);
    return { error: "Couldn't remove the image." };
  }

  if (menu?.menu_image_path) {
    await deleteProfileImage(supabase, cardUuid, menu.menu_image_path).catch(
      (error) => console.error("[card mutation] couldn't delete menu image object", error),
    );
  }

  return {};
}

export async function insertMenuCategory(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: MenuCategoryInput,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { count } = await supabase
    .from("menu_categories")
    .select("*", { count: "exact", head: true })
    .eq("menu_profile_id", menuId);

  const { error } = await supabase.from("menu_categories").insert({
    menu_profile_id: menuId,
    name: data.name,
    is_active: data.isActive,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("[card mutation] add menu category", error);
    return { error: "Couldn't add the category." };
  }
  return {};
}

export async function updateMenuCategory(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  categoryId: string,
  data: MenuCategoryInput,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { error } = await supabase
    .from("menu_categories")
    .update({ name: data.name, is_active: data.isActive })
    .eq("id", categoryId)
    .eq("menu_profile_id", menuId);

  if (error) {
    console.error("[card mutation] update menu category", error);
    return { error: "Couldn't save the category." };
  }
  return {};
}

export async function deleteMenuCategory(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  categoryId: string,
): Promise<MutationResult> {
  const owned = await getOwnedMenuCategoryId(supabase, cardUuid, categoryId);
  if (!owned) return { error: "Category not found." };

  // Collect item image paths so we can delete storage objects after the
  // cascading DB delete removes the rows.
  const { data: items } = await supabase
    .from("menu_items")
    .select("image_path")
    .eq("category_id", categoryId);

  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("menu_profile_id", menuId);

  if (error) {
    console.error("[card mutation] delete menu category", error);
    return { error: "Couldn't delete the category." };
  }

  for (const item of items ?? []) {
    if (item.image_path) {
      await deleteMenuImage(supabase, cardUuid, item.image_path).catch(() => {});
    }
  }
  return {};
}

export async function reorderMenuCategories(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  orderedIds: string[],
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { data: rows, error } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("menu_profile_id", menuId)
    .order("sort_order", { ascending: true });
  if (error || !rows) return { error: "Couldn't reorder the categories." };

  const finalOrder = resolveLinkOrder(rows.map((r) => r.id), orderedIds);
  if (finalOrder.every((id, i) => rows[i]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase
        .from("menu_categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("menu_profile_id", menuId),
    ),
  );
  return firstLinkWriteError(results) ?? {};
}

async function getOwnedMenuItem(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  itemId: string,
): Promise<{ id: string; image_path: string | null } | null> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return null;
  const { data } = await supabase
    .from("menu_items")
    .select("id, image_path, menu_categories!inner(menu_profile_id)")
    .eq("id", itemId)
    .eq("menu_categories.menu_profile_id", menuId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: (data as { id: string }).id,
    image_path: (data as { image_path: string | null }).image_path,
  };
}

export async function insertMenuItem(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: MenuItemInput,
): Promise<MutationResult> {
  const categoryId = await getOwnedMenuCategoryId(supabase, cardUuid, data.categoryId);
  if (!categoryId) return { error: "Category not found." };

  const { count } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { error } = await supabase.from("menu_items").insert({
    category_id: categoryId,
    name: data.name,
    description: data.description ?? null,
    price: data.price ?? null,
    is_available: data.isAvailable,
    sort_order: count ?? 0,
    discount_label: data.discountLabel ?? null,
    discount_price: data.discountPrice ?? null,
    discount_starts_at: data.discountStartsAt ?? null,
    discount_ends_at: data.discountEndsAt ?? null,
  });

  if (error) {
    console.error("[card mutation] add menu item", error);
    return { error: "Couldn't add the item." };
  }
  return {};
}

export async function updateMenuItem(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  itemId: string,
  data: MenuItemInput,
): Promise<MutationResult> {
  const categoryId = await getOwnedMenuCategoryId(supabase, cardUuid, data.categoryId);
  if (!categoryId) return { error: "Category not found." };

  const item = await getOwnedMenuItem(supabase, cardUuid, itemId);
  if (!item) return { error: "Item not found." };

  const { error } = await supabase
    .from("menu_items")
    .update({
      category_id: categoryId,
      name: data.name,
      description: data.description ?? null,
      price: data.price ?? null,
      is_available: data.isAvailable,
      discount_label: data.discountLabel ?? null,
      discount_price: data.discountPrice ?? null,
      discount_starts_at: data.discountStartsAt ?? null,
      discount_ends_at: data.discountEndsAt ?? null,
    })
    .eq("id", itemId);

  if (error) {
    console.error("[card mutation] update menu item", error);
    return { error: "Couldn't save the item." };
  }
  return {};
}

export async function deleteMenuItem(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  itemId: string,
): Promise<MutationResult> {
  const item = await getOwnedMenuItem(supabase, cardUuid, itemId);
  if (!item) return { error: "Item not found." };

  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
  if (error) {
    console.error("[card mutation] delete menu item", error);
    return { error: "Couldn't delete the item." };
  }
  if (item.image_path) {
    await deleteMenuImage(supabase, cardUuid, item.image_path).catch(() => {});
  }
  return {};
}

export async function reorderMenuItems(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  categoryId: string,
  orderedIds: string[],
): Promise<MutationResult> {
  const ownedCategoryId = await getOwnedMenuCategoryId(supabase, cardUuid, categoryId);
  if (!ownedCategoryId) return { error: "Category not found." };

  const { data: rows, error } = await supabase
    .from("menu_items")
    .select("id")
    .eq("category_id", ownedCategoryId)
    .order("sort_order", { ascending: true });
  if (error || !rows) return { error: "Couldn't reorder the items." };

  const finalOrder = resolveLinkOrder(rows.map((r) => r.id), orderedIds);
  if (finalOrder.every((id, i) => rows[i]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase.from("menu_items").update({ sort_order: index }).eq("id", id).eq("category_id", ownedCategoryId),
    ),
  );
  return firstLinkWriteError(results) ?? {};
}

export async function saveMenuItemImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  itemId: string,
  file: File,
): Promise<MutationResult> {
  const item = await getOwnedMenuItem(supabase, cardUuid, itemId);
  if (!item) return { error: "Item not found." };

  let uploaded;
  try {
    uploaded = await uploadMenuImage(supabase, cardUuid, file, "menu-item");
  } catch (error) {
    console.error("[card mutation] upload menu item image", error);
    return { error: "Couldn't upload the image." };
  }
  if ("error" in uploaded) {
    return {
      error:
        uploaded.error === "type"
          ? "Use a JPEG, PNG, or WebP image."
          : "Image must be 5MB or smaller.",
    };
  }

  const previousPath = item.image_path;
  const { error: updateError } = await supabase
    .from("menu_items")
    .update({ image_path: uploaded.path })
    .eq("id", itemId);
  if (updateError) {
    await deleteMenuImage(supabase, cardUuid, uploaded.path).catch(() => {});
    return { error: "Couldn't save the image." };
  }
  if (previousPath && previousPath !== uploaded.path) {
    await deleteMenuImage(supabase, cardUuid, previousPath).catch(() => {});
  }
  return {};
}

export async function removeMenuItemImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  itemId: string,
): Promise<MutationResult> {
  const item = await getOwnedMenuItem(supabase, cardUuid, itemId);
  if (!item) return { error: "Item not found." };

  const { error } = await supabase.from("menu_items").update({ image_path: null }).eq("id", itemId);
  if (error) return { error: "Couldn't remove the image." };
  if (item.image_path) {
    await deleteMenuImage(supabase, cardUuid, item.image_path).catch(() => {});
  }
  return {};
}

export async function insertMenuOffer(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  data: MenuOfferInput,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { count } = await supabase
    .from("menu_offers")
    .select("*", { count: "exact", head: true })
    .eq("menu_profile_id", menuId);

  const { error } = await supabase.from("menu_offers").insert({
    menu_profile_id: menuId,
    title: data.title,
    description: data.description ?? null,
    price_text: data.priceText ?? null,
    starts_at: data.startsAt ?? null,
    ends_at: data.endsAt ?? null,
    is_active: data.isActive,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("[card mutation] add menu offer", error);
    return { error: "Couldn't add the offer." };
  }
  return {};
}

export async function updateMenuOffer(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  offerId: string,
  data: MenuOfferInput,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { error } = await supabase
    .from("menu_offers")
    .update({
      title: data.title,
      description: data.description ?? null,
      price_text: data.priceText ?? null,
      starts_at: data.startsAt ?? null,
      ends_at: data.endsAt ?? null,
      is_active: data.isActive,
    })
    .eq("id", offerId)
    .eq("menu_profile_id", menuId);

  if (error) {
    console.error("[card mutation] update menu offer", error);
    return { error: "Couldn't save the offer." };
  }
  return {};
}

export async function deleteMenuOffer(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  offerId: string,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { data: offer } = await supabase
    .from("menu_offers")
    .select("id, image_path")
    .eq("id", offerId)
    .eq("menu_profile_id", menuId)
    .maybeSingle();
  if (!offer) return { error: "Offer not found." };

  const { error } = await supabase
    .from("menu_offers")
    .delete()
    .eq("id", offerId)
    .eq("menu_profile_id", menuId);
  if (error) {
    console.error("[card mutation] delete menu offer", error);
    return { error: "Couldn't delete the offer." };
  }
  if (offer.image_path) {
    await deleteMenuImage(supabase, cardUuid, offer.image_path).catch(() => {});
  }
  return {};
}

export async function reorderMenuOffers(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  orderedIds: string[],
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { data: rows, error } = await supabase
    .from("menu_offers")
    .select("id")
    .eq("menu_profile_id", menuId)
    .order("sort_order", { ascending: true });
  if (error || !rows) return { error: "Couldn't reorder the offers." };

  const finalOrder = resolveLinkOrder(rows.map((r) => r.id), orderedIds);
  if (finalOrder.every((id, i) => rows[i]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase.from("menu_offers").update({ sort_order: index }).eq("id", id).eq("menu_profile_id", menuId),
    ),
  );
  return firstLinkWriteError(results) ?? {};
}

export async function saveMenuOfferImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  offerId: string,
  file: File,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { data: offer } = await supabase
    .from("menu_offers")
    .select("id, image_path")
    .eq("id", offerId)
    .eq("menu_profile_id", menuId)
    .maybeSingle();
  if (!offer) return { error: "Offer not found." };

  let uploaded;
  try {
    uploaded = await uploadMenuImage(supabase, cardUuid, file, "menu-offer");
  } catch (error) {
    console.error("[card mutation] upload menu offer image", error);
    return { error: "Couldn't upload the image." };
  }
  if ("error" in uploaded) {
    return {
      error:
        uploaded.error === "type"
          ? "Use a JPEG, PNG, or WebP image."
          : "Image must be 5MB or smaller.",
    };
  }

  const previousPath = offer.image_path;
  const { error: updateError } = await supabase
    .from("menu_offers")
    .update({ image_path: uploaded.path })
    .eq("id", offerId)
    .eq("menu_profile_id", menuId);
  if (updateError) {
    await deleteMenuImage(supabase, cardUuid, uploaded.path).catch(() => {});
    return { error: "Couldn't save the image." };
  }
  if (previousPath && previousPath !== uploaded.path) {
    await deleteMenuImage(supabase, cardUuid, previousPath).catch(() => {});
  }
  return {};
}

export async function removeMenuOfferImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  offerId: string,
): Promise<MutationResult> {
  const menuId = await getMenuProfileId(supabase, cardUuid);
  if (!menuId) return { error: "Card not found." };

  const { data: offer } = await supabase
    .from("menu_offers")
    .select("id, image_path")
    .eq("id", offerId)
    .eq("menu_profile_id", menuId)
    .maybeSingle();
  if (!offer) return { error: "Offer not found." };

  const { error } = await supabase
    .from("menu_offers")
    .update({ image_path: null })
    .eq("id", offerId)
    .eq("menu_profile_id", menuId);
  if (error) return { error: "Couldn't remove the image." };
  if (offer.image_path) {
    await deleteMenuImage(supabase, cardUuid, offer.image_path).catch(() => {});
  }
  return {};
}
