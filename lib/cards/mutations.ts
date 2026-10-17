import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  uploadProfileImage,
  deleteProfileImage,
} from "@/lib/storage/profile-images";
import type { ProfileDetailsInput, ProfileLinkInput } from "@/lib/validation/cards";

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

export async function moveProfileLink(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  linkId: string,
  direction: "up" | "down",
): Promise<MutationResult> {
  const profileId = await getProfileId(supabase, cardUuid);
  if (!profileId) return { error: "Card not found." };

  const { data: links, error } = await supabase
    .from("profile_links")
    .select("id, sort_order")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });

  if (error || !links) return { error: "Couldn't reorder the links." };

  const index = links.findIndex((link) => link.id === linkId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= links.length) {
    // Already at the top/bottom — nothing to do, not an error.
    return {};
  }

  const current = links[index];
  const swapWith = links[swapIndex];

  const [firstUpdate, secondUpdate] = await Promise.all([
    supabase
      .from("profile_links")
      .update({ sort_order: swapWith.sort_order })
      .eq("id", current.id),
    supabase
      .from("profile_links")
      .update({ sort_order: current.sort_order })
      .eq("id", swapWith.id),
  ]);

  if (firstUpdate.error || secondUpdate.error) {
    console.error(
      "[card mutation] reorder links",
      firstUpdate.error ?? secondUpdate.error,
    );
    return { error: "Couldn't reorder the links." };
  }
  return {};
}
