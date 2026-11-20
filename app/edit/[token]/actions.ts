"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  profileDetailsSchema,
  storeDetailsSchema,
  paymentDetailsSchema,
  menuDetailsSchema,
  menuCategorySchema,
  menuItemSchema,
  menuOfferSchema,
  profileLinkSchema,
  cardThemeSchema,
  type ProfileDetailsInput,
  type StoreDetailsInput,
  type PaymentDetailsInput,
  type MenuDetailsInput,
  type MenuCategoryInput,
  type MenuItemInput,
  type MenuOfferInput,
  type ProfileLinkInput,
} from "@/lib/validation/cards";
import type { CardTheme } from "@/types";
import * as cardMutations from "@/lib/cards/mutations";
import {
  resolveEditSession,
  closeEditSession,
  type EditSession,
} from "@/lib/cards/edit-session";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { generateReviewLink } from "@/lib/google/review-link";

export type EditActionResult = { error?: string };

/** Same treatment the admin side gives a store's review URL — convert a
 * Maps/share link to Google's writereview URL when possible. */
async function normalizeReviewUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  const result = await generateReviewLink(trimmed);
  return result.url ?? trimmed;
}

/**
 * Customer-facing edit actions. Authorization is the token itself:
 * resolveEditSession() maps it to one card and hands back a service-role
 * client scoped to that card, and every link mutation re-checks the
 * profile, so a forged link id can't reach another card. Rate limiting
 * is keyed on the (hashed) client IP plus the token, so one abusive
 * visitor can't churn a card's data.
 */
async function authorize(action: string, token: string): Promise<EditSession> {
  const requestHeaders = await headers();
  const key = hashIdentifier(
    `edit:${action}:${getClientIp(requestHeaders)}:${token.slice(0, 16)}`,
  );
  const allowed = await rateLimit(key, 90, 60);
  if (!allowed) {
    return { error: "Too many changes at once. Please wait a moment." };
  }
  return resolveEditSession(token);
}

function refresh(token: string): void {
  revalidatePath(`/edit/${token}`);
}

export async function editUpdateProfileDetails(
  token: string,
  input: ProfileDetailsInput,
): Promise<EditActionResult> {
  const parsed = profileDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("profile", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveProfileDetails(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadProfileImage(
  token: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const session = await authorize("photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveProfileImage(
    session.supabase,
    session.cardUuid,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemoveProfileImage(
  token: string,
): Promise<EditActionResult> {
  const session = await authorize("photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removeProfileImage(
    session.supabase,
    session.cardUuid,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddProfileLink(
  token: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertProfileLink(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdateProfileLink(
  token: string,
  linkId: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updateProfileLink(
    session.supabase,
    session.cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeleteProfileLink(
  token: string,
  linkId: string,
): Promise<EditActionResult> {
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deleteProfileLink(
    session.supabase,
    session.cardUuid,
    linkId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editSetProfileLinkActive(
  token: string,
  linkId: string,
  isActive: boolean,
): Promise<EditActionResult> {
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.setProfileLinkActive(
    session.supabase,
    session.cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

/** Saves a whole new link order at once — see reorderProfileLinks. */
export async function editReorderProfileLinks(
  token: string,
  orderedIds: string[],
): Promise<EditActionResult> {
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.reorderProfileLinks(
    session.supabase,
    session.cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

/**
 * Saves the accent theme of the customer's public page. Same token
 * authorization as every other customer action; the mutation itself
 * refuses redirect cards, and the edit page only ever renders for a
 * PROFILE / STORE_PROFILE card anyway.
 */
export async function editUpdateCardTheme(
  token: string,
  theme: CardTheme,
): Promise<EditActionResult> {
  const parsed = cardThemeSchema.safeParse(theme);
  if (!parsed.success) return { error: "Invalid theme." };

  const session = await authorize("theme", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveCardTheme(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

/**
 * The customer's "save and close" — ends the edit window. Goes through
 * the same rate limiter as every other edit action: the token is the
 * credential here, so churning close/reopen would be a cheap way to
 * hammer the session table.
 */
export async function editSaveAndClose(token: string): Promise<EditActionResult> {
  const session = await authorize("close", token);
  if ("error" in session) return { error: session.error };
  return closeEditSession(token);
}

// --- Store variants ---------------------------------------------------
// Same shape as the profile actions above, driving the store_profiles /
// store_links tables. The store customer edit view builds a StoreEditActions
// bundle out of these.

export async function editUpdateStoreDetails(
  token: string,
  input: StoreDetailsInput,
): Promise<EditActionResult> {
  const parsed = storeDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("store", token);
  if ("error" in session) return { error: session.error };

  const data = parsed.data;
  if (data.googleReviewUrl) {
    data.googleReviewUrl = await normalizeReviewUrl(data.googleReviewUrl);
  }

  const result = await cardMutations.saveStoreDetails(
    session.supabase,
    session.cardUuid,
    data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadStoreImage(
  token: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const session = await authorize("store-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveStoreImage(
    session.supabase,
    session.cardUuid,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemoveStoreImage(
  token: string,
): Promise<EditActionResult> {
  const session = await authorize("store-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removeStoreImage(
    session.supabase,
    session.cardUuid,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddStoreLink(
  token: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("store-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertStoreLink(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdateStoreLink(
  token: string,
  linkId: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("store-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updateStoreLink(
    session.supabase,
    session.cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeleteStoreLink(
  token: string,
  linkId: string,
): Promise<EditActionResult> {
  const session = await authorize("store-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deleteStoreLink(
    session.supabase,
    session.cardUuid,
    linkId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editSetStoreLinkActive(
  token: string,
  linkId: string,
  isActive: boolean,
): Promise<EditActionResult> {
  const session = await authorize("store-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.setStoreLinkActive(
    session.supabase,
    session.cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

/** Saves a whole new store-link order at once — see reorderProfileLinks. */
export async function editReorderStoreLinks(
  token: string,
  orderedIds: string[],
): Promise<EditActionResult> {
  const session = await authorize("store-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.reorderStoreLinks(
    session.supabase,
    session.cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

// --- Multiple payment methods variants --------------------------------
// The customer edit view builds a PaymentEditActions bundle out of these;
// the mutation layer re-checks the card type for every write.

export async function editUpdatePaymentDetails(
  token: string,
  input: PaymentDetailsInput,
): Promise<EditActionResult> {
  const parsed = paymentDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("payment", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.savePaymentDetails(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadPaymentImage(
  token: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const session = await authorize("payment-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.savePaymentImage(
    session.supabase,
    session.cardUuid,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemovePaymentImage(
  token: string,
): Promise<EditActionResult> {
  const session = await authorize("payment-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removePaymentImage(
    session.supabase,
    session.cardUuid,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddPaymentLink(
  token: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("payment-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertPaymentLink(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdatePaymentLink(
  token: string,
  linkId: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("payment-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updatePaymentLink(
    session.supabase,
    session.cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeletePaymentLink(
  token: string,
  linkId: string,
): Promise<EditActionResult> {
  const session = await authorize("payment-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deletePaymentLink(
    session.supabase,
    session.cardUuid,
    linkId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editSetPaymentLinkActive(
  token: string,
  linkId: string,
  isActive: boolean,
): Promise<EditActionResult> {
  const session = await authorize("payment-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.setPaymentLinkActive(
    session.supabase,
    session.cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

/** Saves a whole new payment-link order at once — see reorderProfileLinks. */
export async function editReorderPaymentLinks(
  token: string,
  orderedIds: string[],
): Promise<EditActionResult> {
  const session = await authorize("payment-link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.reorderPaymentLinks(
    session.supabase,
    session.cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

// --- Menu variants ----------------------------------------------------
// Same shape as the store actions, driving menu_profiles /
// menu_categories / menu_items / menu_offers.

export async function editUpdateMenuDetails(
  token: string,
  input: MenuDetailsInput,
): Promise<EditActionResult> {
  const parsed = menuDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const data = parsed.data;
  if (data.googleReviewUrl) {
    data.googleReviewUrl = await normalizeReviewUrl(data.googleReviewUrl);
  }

  const result = await cardMutations.saveMenuDetails(
    session.supabase,
    session.cardUuid,
    data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadMenuImage(
  token: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const session = await authorize("menu-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveMenuImage(
    session.supabase,
    session.cardUuid,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemoveMenuImage(
  token: string,
): Promise<EditActionResult> {
  const session = await authorize("menu-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removeMenuImage(
    session.supabase,
    session.cardUuid,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddMenuCategory(
  token: string,
  input: MenuCategoryInput,
): Promise<EditActionResult> {
  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertMenuCategory(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdateMenuCategory(
  token: string,
  categoryId: string,
  input: MenuCategoryInput,
): Promise<EditActionResult> {
  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updateMenuCategory(
    session.supabase,
    session.cardUuid,
    categoryId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeleteMenuCategory(
  token: string,
  categoryId: string,
): Promise<EditActionResult> {
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deleteMenuCategory(
    session.supabase,
    session.cardUuid,
    categoryId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editReorderMenuCategories(
  token: string,
  orderedIds: string[],
): Promise<EditActionResult> {
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.reorderMenuCategories(
    session.supabase,
    session.cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddMenuItem(
  token: string,
  input: MenuItemInput,
): Promise<EditActionResult> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertMenuItem(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdateMenuItem(
  token: string,
  itemId: string,
  input: MenuItemInput,
): Promise<EditActionResult> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updateMenuItem(
    session.supabase,
    session.cardUuid,
    itemId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeleteMenuItem(
  token: string,
  itemId: string,
): Promise<EditActionResult> {
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deleteMenuItem(
    session.supabase,
    session.cardUuid,
    itemId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editReorderMenuItems(
  token: string,
  categoryId: string,
  orderedIds: string[],
): Promise<EditActionResult> {
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.reorderMenuItems(
    session.supabase,
    session.cardUuid,
    categoryId,
    orderedIds,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadMenuItemImage(
  token: string,
  itemId: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  const session = await authorize("menu-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveMenuItemImage(
    session.supabase,
    session.cardUuid,
    itemId,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemoveMenuItemImage(
  token: string,
  itemId: string,
): Promise<EditActionResult> {
  const session = await authorize("menu-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removeMenuItemImage(
    session.supabase,
    session.cardUuid,
    itemId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddMenuOffer(
  token: string,
  input: MenuOfferInput,
): Promise<EditActionResult> {
  const parsed = menuOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertMenuOffer(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdateMenuOffer(
  token: string,
  offerId: string,
  input: MenuOfferInput,
): Promise<EditActionResult> {
  const parsed = menuOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updateMenuOffer(
    session.supabase,
    session.cardUuid,
    offerId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeleteMenuOffer(
  token: string,
  offerId: string,
): Promise<EditActionResult> {
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deleteMenuOffer(
    session.supabase,
    session.cardUuid,
    offerId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editReorderMenuOffers(
  token: string,
  orderedIds: string[],
): Promise<EditActionResult> {
  const session = await authorize("menu", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.reorderMenuOffers(
    session.supabase,
    session.cardUuid,
    orderedIds,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadMenuOfferImage(
  token: string,
  offerId: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  const session = await authorize("menu-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveMenuOfferImage(
    session.supabase,
    session.cardUuid,
    offerId,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemoveMenuOfferImage(
  token: string,
  offerId: string,
): Promise<EditActionResult> {
  const session = await authorize("menu-photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removeMenuOfferImage(
    session.supabase,
    session.cardUuid,
    offerId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}