"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/auth/require-admin";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validation/auth";
import {
  socialLinkSchema,
  siteSettingsSchema,
  type SocialLinkInput,
  type SiteSettingsInput,
} from "@/lib/validation/social-links";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";

export type SettingsActionResult = { error?: string };

export async function changePassword(
  input: ChangePasswordInput,
): Promise<SettingsActionResult> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase, user } = context;

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  // Re-verifying the current password is a brute-force oracle if left
  // unlimited (a stolen session could otherwise guess it), so it shares
  // the login limiter's philosophy: few attempts per window.
  const allowed = await rateLimit(
    `pwchange:${hashIdentifier(user.id)}`,
    5,
    15 * 60,
  );
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  if (!user.email) return { error: "Couldn't verify your account." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    console.error("[settings] password update failed:", error.message);
    return { error: "Couldn't update the password." };
  }

  return {};
}

// --- Footer social links ----------------------------------------------

/** Revalidates every surface the footer renders on. */
function revalidateFooter() {
  revalidatePath("/admin/settings");
}

export async function addSocialLink(
  input: SocialLinkInput,
): Promise<SettingsActionResult> {
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }

  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  // New links go to the end of the list.
  const { count } = await supabase
    .from("social_links")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("social_links").insert({
    icon: parsed.data.icon,
    label: parsed.data.label,
    url: parsed.data.url,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("[settings] add social link", error);
    return { error: "Couldn't add the link." };
  }

  revalidateFooter();
  return {};
}

export async function updateSocialLink(
  linkId: string,
  input: SocialLinkInput,
): Promise<SettingsActionResult> {
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }

  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const { error } = await supabase
    .from("social_links")
    .update({
      icon: parsed.data.icon,
      label: parsed.data.label,
      url: parsed.data.url,
    })
    .eq("id", linkId);

  if (error) {
    console.error("[settings] update social link", error);
    return { error: "Couldn't save the link." };
  }

  revalidateFooter();
  return {};
}

export async function deleteSocialLink(
  linkId: string,
): Promise<SettingsActionResult> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const { error } = await supabase.from("social_links").delete().eq("id", linkId);

  if (error) {
    console.error("[settings] delete social link", error);
    return { error: "Couldn't delete the link." };
  }

  revalidateFooter();
  return {};
}

export async function setSocialLinkActive(
  linkId: string,
  isActive: boolean,
): Promise<SettingsActionResult> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const { error } = await supabase
    .from("social_links")
    .update({ is_active: isActive })
    .eq("id", linkId);

  if (error) {
    console.error("[settings] toggle social link", error);
    return { error: "Couldn't update the link." };
  }

  revalidateFooter();
  return {};
}

/**
 * Saves a whole new social-link order at once. Social links are global
 * (no card owner), so this resolves and writes the order itself rather
 * than going through the card-side helper.
 */
export async function reorderSocialLinks(
  orderedIds: string[],
): Promise<SettingsActionResult> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const { data: rows, error } = await supabase
    .from("social_links")
    .select("id")
    .order("sort_order", { ascending: true });

  if (error || !rows) return { error: "Couldn't reorder the links." };

  // Resolve against what the database holds so a stale tab can't drop a
  // link another tab added: unknown ids are ignored, and rows the client
  // never saw keep their place at the end.
  const held = new Set(rows.map((row) => row.id));
  const requested = new Set(orderedIds);
  const finalOrder = [
    ...orderedIds.filter((id) => held.has(id)),
    ...rows.map((row) => row.id).filter((id) => !requested.has(id)),
  ];

  // Already in this order — don't spend a write (or a revalidation) on it.
  if (finalOrder.every((id, index) => rows[index]?.id === id)) return {};

  const results = await Promise.all(
    finalOrder.map((id, index) =>
      supabase
        .from("social_links")
        .update({ sort_order: index })
        .eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("[settings] reorder social links", failed.error);
    return { error: "Couldn't reorder the links." };
  }

  revalidateFooter();
  return {};
}

export async function updateSiteSettings(
  input: SiteSettingsInput,
): Promise<SettingsActionResult> {
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const { error } = await supabase
    .from("site_settings")
    .update({ make_your_own_url: parsed.data.makeYourOwnUrl ?? null })
    .eq("id", 1);

  if (error) {
    console.error("[settings] update site settings", error);
    return { error: "Couldn't save the settings." };
  }

  revalidateFooter();
  return {};
}
